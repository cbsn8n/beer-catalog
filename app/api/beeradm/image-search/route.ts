import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { addAuditEntry } from "@/lib/beeradm";

type SearchResult = {
  title: string;
  imageUrl: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
};

function getPublicBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  const fHost = req.headers.get("x-forwarded-host");
  if (fHost) {
    const fProto = req.headers.get("x-forwarded-proto") || "https";
    return `${fProto}://${fHost}`;
  }

  const host = req.headers.get("host") || new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "") || "https";
  return `${proto}://${host}`;
}

function toAbsoluteImageUrl(value: string, req: NextRequest) {
  if (/^https?:\/\//i.test(value)) return value;

  const base = getPublicBaseUrl(req);
  return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}

function toSerperSafeLensUrl(value: string, req: NextRequest) {
  const raw = toAbsoluteImageUrl(value, req);
  const url = new URL(raw);

  if (!/^https?:$/i.test(url.protocol)) {
    throw new Error("Lens supports only http/https URLs");
  }

  // Serper Lens can reject transformed/cached image URLs with params.
  // Use canonical image URL without runtime resize/cache params.
  url.searchParams.delete("w");
  url.searchParams.delete("q");
  url.searchParams.delete("v");

  return url.toString();
}

function asString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function pickImageUrl(obj: Record<string, unknown>) {
  const candidates = [obj.imageUrl, obj.image_url, obj.image, obj.thumbnail, obj.original];
  for (const c of candidates) {
    const s = asString(c);
    if (/^https?:\/\//i.test(s)) return s;
  }
  return "";
}

function pickSourceUrl(obj: Record<string, unknown>) {
  const candidates = [obj.link, obj.url, obj.pageUrl, obj.page_url, obj.source_url];
  for (const c of candidates) {
    const s = asString(c);
    if (/^https?:\/\//i.test(s)) return s;
  }
  return "";
}

function extractResults(payload: any): SearchResult[] {
  const buckets: unknown[] = [];
  if (Array.isArray(payload?.organic)) buckets.push(...payload.organic);
  if (Array.isArray(payload?.visualMatches)) buckets.push(...payload.visualMatches);
  if (Array.isArray(payload?.images_results)) buckets.push(...payload.images_results);
  if (Array.isArray(payload?.image_results)) buckets.push(...payload.image_results);
  if (Array.isArray(payload?.inline_images)) buckets.push(...payload.inline_images);
  if (Array.isArray(payload?.images)) buckets.push(...payload.images);

  const out: SearchResult[] = [];
  const seen = new Set<string>();

  for (const raw of buckets) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;

    const imageUrl = pickImageUrl(obj);
    if (!imageUrl) continue;
    if (seen.has(imageUrl)) continue;
    seen.add(imageUrl);

    const title = asString(obj.title) || asString(obj.snippet) || "Без названия";
    const sourceUrl = pickSourceUrl(obj) || null;
    const sourceName = asString(obj.source) || asString(obj.displayed_link) || null;

    out.push({ title, imageUrl, sourceUrl, sourceName });
    if (out.length >= 30) break;
  }

  return out;
}

async function searchByLens(req: NextRequest, imageUrl: string) {
  const apiKey = process.env.SERPER_API || process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API is not configured");

  const url = "https://google.serper.dev/lens";
  const target = toSerperSafeLensUrl(imageUrl, req);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: target }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Serper lens failed: HTTP ${res.status}${txt ? ` - ${txt.slice(0, 220)}` : ""} (target: ${target})`);
  }

  const payload = await res.json();
  return extractResults(payload);
}

async function searchByName(query: string) {
  const apiKey = process.env.SERPAPI_API;
  if (!apiKey) throw new Error("SERPAPI_API is not configured");

  // Primary endpoint requested by user.
  const direct = new URL("https://serpapi.com/google-images-light-api");
  direct.searchParams.set("api_key", apiKey);
  direct.searchParams.set("q", query);
  direct.searchParams.set("imgsz", "svga");
  direct.searchParams.set("image_color", "white");
  direct.searchParams.set("output", "json");

  const tryDirect = await fetch(direct.toString());
  let payload: any = null;

  if (tryDirect.ok) {
    payload = await tryDirect.json().catch(() => null);
  }

  if (!payload) {
    // Fallback SerpAPI canonical endpoint.
    const fallback = new URL("https://serpapi.com/search.json");
    fallback.searchParams.set("engine", "google_images_light");
    fallback.searchParams.set("api_key", apiKey);
    fallback.searchParams.set("q", query);
    fallback.searchParams.set("imgsz", "svga");
    fallback.searchParams.set("image_color", "white");

    const res = await fetch(fallback.toString());
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`SerpAPI failed: HTTP ${res.status}${txt ? ` - ${txt.slice(0, 160)}` : ""}`);
    }
    payload = await res.json();
  }

  return extractResults(payload);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;

    if (mode === "lens") {
      const imageUrl = asString(body?.imageUrl);
      if (!imageUrl) {
        return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
      }

      const results = await searchByLens(req, imageUrl);
      addAuditEntry("admin_image_search_lens", { imageUrl, results: results.length });
      return NextResponse.json({ ok: true, mode, results });
    }

    if (mode === "name") {
      const query = asString(body?.query);
      if (!query) {
        return NextResponse.json({ error: "query is required" }, { status: 400 });
      }

      const results = await searchByName(query);
      addAuditEntry("admin_image_search_name", { query, results: results.length });
      return NextResponse.json({ ok: true, mode, results });
    }

    return NextResponse.json({ error: "Unknown mode" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
