import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { addAuditEntry } from "@/lib/beeradm";
import { getImageVersion, setImageVersion } from "@/lib/image-versions";
import { markBeerDeletedTombstone } from "@/lib/sync-overrides";
import type { Beer } from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

function readBeers(): Beer[] {
  if (!fs.existsSync(JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as Beer[];
}

function writeBeers(beers: Beer[]) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(beers, null, 2));
}

function asNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asBool(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1 || value === "on";
}

function extFromFile(file: File) {
  const mime = file.type || "";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";

  const byName = path.extname(file.name || "").toLowerCase().replace(".", "");
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  return "jpg";
}

async function saveAdminUpload(file: File, beerId: number) {
  if (file.size <= 0) throw new Error("Пустой файл");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Файл слишком большой (макс 12MB)");
  if (!file.type.startsWith("image/")) throw new Error("Можно загружать только изображения");

  const ext = extFromFile(file);
  const relDir = "admin-upload";
  const fileName = `beer-${beerId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  const absDir = path.join(IMAGES_DIR, relDir);
  const absPath = path.join(absDir, fileName);

  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(absPath, Buffer.from(await file.arrayBuffer()));

  const localUrl = `/data/images/${relDir}/${fileName}`;
  setImageVersion(localUrl, Date.now());
  return localUrl;
}

function normalizeImages(input: unknown): NonNullable<Beer["images"]> {
  if (!Array.isArray(input)) return [];

  const normalized: NonNullable<Beer["images"]> = [];
  for (const item of input) {
    const local = asNullableString((item as any)?.local);
    const remote = asNullableString((item as any)?.remote);

    if (!local && !remote) continue;
    if (local && !local.startsWith("/data/images/")) continue;

    normalized.push({ local, remote });
  }

  return normalized;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const beerId = Number(req.nextUrl.searchParams.get("beerId"));
  if (!Number.isFinite(beerId)) {
    return NextResponse.json({ error: "beerId is required" }, { status: 400 });
  }

  const beers = readBeers();
  const beer = beers.find((item) => item.id === beerId);
  if (!beer) {
    return NextResponse.json({ error: "Beer not found" }, { status: 404 });
  }

  return NextResponse.json({ beer }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const action = typeof form.get("action") === "string" ? String(form.get("action")) : "";

    if (action !== "upload") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const beerId = Number(form.get("beerId"));
    if (!Number.isFinite(beerId)) {
      return NextResponse.json({ error: "beerId is required" }, { status: 400 });
    }

    const file = form.get("imageFile");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "imageFile is required" }, { status: 400 });
    }

    const localUrl = await saveAdminUpload(file, beerId);
    addAuditEntry("admin_beer_image_uploaded", { beerId, localUrl });

    return NextResponse.json({ ok: true, localUrl, version: getImageVersion(localUrl) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const beerId = Number(body?.beerId);
    if (!Number.isFinite(beerId)) {
      return NextResponse.json({ error: "beerId is required" }, { status: 400 });
    }

    const beers = readBeers();
    const idx = beers.findIndex((item) => item.id === beerId);
    if (idx === -1) {
      return NextResponse.json({ error: "Beer not found" }, { status: 404 });
    }

    const current = beers[idx];
    const name = asNullableString(body?.name);
    if (!name) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    const images = normalizeImages(body?.images);
    const first = images[0] || null;

    const rating = asNullableNumber(body?.rating);
    if (rating != null && (rating < 1 || rating > 10)) {
      return NextResponse.json({ error: "Оценка должна быть от 1 до 10" }, { status: 400 });
    }

    const price = asNullableNumber(body?.price);
    if (price != null && price < 0) {
      return NextResponse.json({ error: "Цена не может быть отрицательной" }, { status: 400 });
    }

    const next: Beer = {
      ...current,
      name,
      type: asNullableString(body?.type),
      sort: asNullableString(body?.sort),
      filtration: asNullableString(body?.filtration),
      country: asNullableString(body?.country),
      price,
      rating,
      comment: asNullableString(body?.comment),
      traits: {
        socks: asBool(body?.traits?.socks),
        bitter: asBool(body?.traits?.bitter),
        sour: asBool(body?.traits?.sour),
        fruity: asBool(body?.traits?.fruity),
        smoked: asBool(body?.traits?.smoked),
        watery: asBool(body?.traits?.watery),
        spirity: asBool(body?.traits?.spirity),
      },
      images,
      image: first?.local ?? null,
      imageRemote: first?.remote ?? null,
      imageVersion: first?.local ? getImageVersion(first.local) : null,
    };

    beers[idx] = next;
    writeBeers(beers);

    addAuditEntry("admin_beer_updated", {
      beerId,
      name: next.name,
      images: images.length,
    });

    return NextResponse.json({ ok: true, beer: next });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const beerId = Number(body?.beerId);
    if (!Number.isFinite(beerId)) {
      return NextResponse.json({ error: "beerId is required" }, { status: 400 });
    }

    const beers = readBeers();
    const idx = beers.findIndex((item) => item.id === beerId);
    if (idx === -1) {
      return NextResponse.json({ error: "Beer not found" }, { status: 404 });
    }

    const [removed] = beers.splice(idx, 1);
    writeBeers(beers);

    markBeerDeletedTombstone({
      id: removed.id,
      name: removed.name,
      reason: "admin_delete",
    });

    addAuditEntry("admin_beer_deleted", {
      beerId: removed.id,
      name: removed.name,
    });

    return NextResponse.json({ ok: true, deletedBeerId: removed.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 400 });
  }
}
