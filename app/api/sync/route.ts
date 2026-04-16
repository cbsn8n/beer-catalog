import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { isAdminRequest } from "@/lib/admin-auth";
import { addAuditEntry, addSyncHistory } from "@/lib/beeradm";
import { normalizeBeerName, readSyncOverrides } from "@/lib/sync-overrides";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const PAGE_SIZE = 200;
const CONCURRENT_DL = 10;

type BeerLike = {
  id: number;
  name: string;
  image: string | null;
  imageRemote?: string | null;
  images?: Array<{ local: string | null; remote: string | null; version?: number | null }>;
  type: string | null;
  sort: string | null;
  filtration: string | null;
  country: string | null;
  price: number | null;
  traits: {
    socks: boolean;
    bitter: boolean;
    sour: boolean;
    fruity: boolean;
    smoked: boolean;
    watery: boolean;
    spirity: boolean;
  };
  rating: number | null;
  comment: string | null;
  imageVersion?: number | null;
};

type BuiltNocoBeer = {
  beer: BeerLike;
  imageTasks: Array<{ url: string; dest: string }>;
};

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "true";
}

function normalizeName(v: unknown) {
  return normalizeBeerName(v);
}

function hasAnyImages(beer: Partial<BeerLike> | null | undefined) {
  if (!beer) return false;
  if (beer.image || beer.imageRemote) return true;
  if (Array.isArray(beer.images)) {
    return beer.images.some((img) => Boolean(img?.local || img?.remote));
  }
  return false;
}

function readCurrentBeers(): BeerLike[] {
  if (!fs.existsSync(JSON_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as BeerLike[];
  } catch {
    return [];
  }
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = fs.createWriteStream(dest);
    const proto = url.startsWith("https") ? https : http;
    const req = proto.get(url, { timeout: 15000 }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        const loc = response.headers.location;
        if (loc) return downloadFile(loc, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        try {
          fs.unlinkSync(dest);
        } catch {}
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    });
    req.on("error", (err) => {
      file.close();
      try {
        fs.unlinkSync(dest);
      } catch {}
      reject(err);
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

interface NocoBeer {
  Id: number;
  Название: string;
  Фото: Array<{ path: string; signedPath: string; title: string; mimetype: string }> | null;
  Тип: string | null;
  Сорт: string | null;
  Фильтрация: string | null;
  Страна: string | null;
  Цена: number | null;
  Носки: boolean | number;
  Горчит: boolean | number;
  Кислит: boolean | number;
  Фруктовое: boolean | number;
  Копченое: boolean | number;
  Водянистое: boolean | number;
  Спиртовое: boolean | number | string;
  Оценка: number | null;
  Комментарий: string | null;
}

async function fetchPage(apiUrl: string, apiKey: string, tableId: string, offset: number) {
  const url = `${apiUrl}/api/v2/tables/${tableId}/records?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, { headers: { "xc-token": apiKey } });
  if (!res.ok) throw new Error(`NocoDB ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { list: data.list as NocoBeer[], totalRows: (data.pageInfo?.totalRows ?? 0) as number };
}

function buildNocoBeer(rec: NocoBeer, apiUrl: string): BuiltNocoBeer {
  let imagePath: string | null = null;
  let imageRemote: string | null = null;
  const images: { local: string | null; remote: string | null }[] = [];
  const imageTasks: Array<{ url: string; dest: string }> = [];

  if (rec.Фото && rec.Фото.length > 0) {
    rec.Фото.forEach((photo, idx) => {
      const ext = photo.mimetype?.includes("png") ? "png" : "jpg";
      const localName = idx === 0 ? `${rec.Id}.${ext}` : `${rec.Id}-${idx + 1}.${ext}`;
      const localDest = path.join(IMAGES_DIR, localName);
      const localUrl = `/data/images/${localName}`;
      const remoteUrl = `${apiUrl}/${photo.signedPath}`;

      images.push({ local: localUrl, remote: remoteUrl });
      if (idx === 0) {
        imagePath = localUrl;
        imageRemote = remoteUrl;
      }
      imageTasks.push({ url: remoteUrl, dest: localDest });
    });
  }

  return {
    beer: {
      id: rec.Id,
      name: rec.Название || "Без названия",
      image: imagePath,
      imageRemote,
      images,
      type: rec.Тип || null,
      sort: rec.Сорт || null,
      filtration: rec.Фильтрация || null,
      country: rec.Страна || null,
      price: rec.Цена ?? null,
      traits: {
        socks: toBool(rec.Носки),
        bitter: toBool(rec.Горчит),
        sour: toBool(rec.Кислит),
        fruity: toBool(rec.Фруктовое),
        smoked: toBool(rec.Копченое),
        watery: toBool(rec.Водянистое),
        spirity: toBool(rec.Спиртовое),
      },
      rating: rec.Оценка ?? null,
      comment: rec.Комментарий || null,
    },
    imageTasks,
  };
}

function mergeBeers(existing: BeerLike[], incomingBuilt: BuiltNocoBeer[]) {
  const byId = new Map<number, { beer: BeerLike; idx: number }>();
  const byName = new Map<string, { beer: BeerLike; idx: number }>();

  existing.forEach((beer, idx) => {
    byId.set(beer.id, { beer, idx });
    const n = normalizeName(beer.name);
    if (n && !byName.has(n)) byName.set(n, { beer, idx });
  });

  const overrides = readSyncOverrides();
  const deletedById = new Set(
    overrides.deletedBeers
      .map((item) => item.id)
      .filter((id): id is number => Number.isFinite(id))
  );
  const deletedByName = new Set(
    overrides.deletedBeers
      .map((item) => item.normalizedName)
      .filter((name): name is string => Boolean(name))
  );

  const matchedIdx = new Set<number>();
  const merged: BeerLike[] = [];
  const imageTasks: Array<{ url: string; dest: string }> = [];
  let skippedDeleted = 0;

  for (const incoming of incomingBuilt) {
    const incBeer = incoming.beer;
    const incName = normalizeName(incBeer.name);

    if (deletedById.has(incBeer.id) || (incName && deletedByName.has(incName))) {
      skippedDeleted += 1;
      continue;
    }

    const byIdHit = byId.get(incBeer.id);
    const byNameHit = byName.get(incName);
    const hit = byIdHit || byNameHit;

    if (!hit) {
      merged.push(incBeer);
      imageTasks.push(...incoming.imageTasks);
      continue;
    }

    matchedIdx.add(hit.idx);
    const prev = hit.beer;
    const keepImages = hasAnyImages(prev);

    // Site data is authoritative for matched cards.
    const next: BeerLike = {
      ...incBeer,
      ...prev,
      id: prev.id ?? incBeer.id,
    };

    if (keepImages) {
      next.image = prev.image ?? null;
      next.imageRemote = prev.imageRemote ?? null;
      next.images = Array.isArray(prev.images) ? prev.images : [];
      next.imageVersion = prev.imageVersion ?? null;
    } else {
      next.image = incBeer.image ?? null;
      next.imageRemote = incBeer.imageRemote ?? null;
      next.images = Array.isArray(incBeer.images) ? incBeer.images : [];
      next.imageVersion = incBeer.imageVersion ?? null;
      imageTasks.push(...incoming.imageTasks);
    }

    merged.push(next);
  }

  // Keep local-only beers (not present in NocoDB) untouched.
  for (let i = 0; i < existing.length; i += 1) {
    if (!matchedIdx.has(i)) {
      merged.push(existing[i]);
    }
  }

  return { beers: merged, imageTasks, skippedDeleted };
}

export async function POST(req: NextRequest) {
  const startedMs = Date.now();
  const startedAt = new Date(startedMs).toISOString();
  const body = await req.json().catch(() => ({}));
  const isAdmin = isAdminRequest(req);
  const trigger: "admin-session" | "secret" = isAdmin ? "admin-session" : "secret";
  const secret = process.env.SYNC_TRIGGER_SECRET;

  // Access policy:
  // - Admin session cookie is always accepted
  // - SYNC_TRIGGER_SECRET works as service access (webhook/automation)
  if (!isAdmin) {
    if (!secret || body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const API_URL = process.env.NOCO_DB_API_URL;
  const API_KEY = process.env.NOCO_DB_API_KEY;
  const TABLE_ID = process.env.NOCO_DB_TABLE_ID;
  if (!API_URL || !API_KEY || !TABLE_ID) {
    return NextResponse.json({ error: "Missing NOCO_DB env vars" }, { status: 500 });
  }

  try {
    addAuditEntry("sync_started", { trigger });
    fs.mkdirSync(IMAGES_DIR, { recursive: true });

    const allRecords: NocoBeer[] = [];
    let offset = 0;
    let totalRows = 0;
    do {
      const page = await fetchPage(API_URL, API_KEY, TABLE_ID, offset);
      totalRows = page.totalRows;
      allRecords.push(...page.list);
      offset += PAGE_SIZE;
    } while (allRecords.length < totalRows);

    const incomingBuilt = allRecords.map((rec) => buildNocoBeer(rec, API_URL));
    const existing = readCurrentBeers();
    const { beers, imageTasks, skippedDeleted } = mergeBeers(existing, incomingBuilt);

    fs.writeFileSync(JSON_PATH, JSON.stringify(beers, null, 2));

    // download images
    let downloaded = 0,
      skipped = 0,
      failed = 0;
    for (let i = 0; i < imageTasks.length; i += CONCURRENT_DL) {
      const batch = imageTasks.slice(i, i + CONCURRENT_DL);
      const results = await Promise.allSettled(
        batch.map(async ({ url, dest }) => {
          if (fs.existsSync(dest)) {
            skipped++;
            return;
          }
          await downloadFile(url, dest);
          downloaded++;
        })
      );
      for (const r of results) if (r.status === "rejected") failed++;
    }

    const finishedMs = Date.now();
    const finishedAt = new Date(finishedMs).toISOString();
    const durationMs = finishedMs - startedMs;

    addSyncHistory({
      id: `${startedMs}-${Math.random().toString(16).slice(2, 8)}`,
      trigger,
      status: "success",
      startedAt,
      finishedAt,
      durationMs,
      beers: beers.length,
      images: { downloaded, skipped, failed },
    });

    addAuditEntry("sync_finished", {
      trigger,
      beers: beers.length,
      downloaded,
      skipped,
      failed,
      durationMs,
      mergedWithLocal: true,
      skippedDeleted,
    });

    return NextResponse.json({
      ok: true,
      beers: beers.length,
      durationMs,
      images: { downloaded, skipped, failed },
      mergedWithLocal: true,
      skippedDeleted,
    });
  } catch (err: any) {
    const finishedMs = Date.now();
    const finishedAt = new Date(finishedMs).toISOString();
    const durationMs = finishedMs - startedMs;
    const error = err?.message || "Unknown error";

    addSyncHistory({
      id: `${startedMs}-${Math.random().toString(16).slice(2, 8)}`,
      trigger,
      status: "error",
      startedAt,
      finishedAt,
      durationMs,
      beers: 0,
      images: { downloaded: 0, skipped: 0, failed: 0 },
      error,
    });

    addAuditEntry("sync_failed", {
      trigger,
      error,
      durationMs,
    });

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
