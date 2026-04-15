/**
 * NocoDB → local JSON + images sync script.
 * Run: npx tsx scripts/sync.ts
 */

import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const API_URL = process.env.NOCO_DB_API_URL!;
const API_KEY = process.env.NOCO_DB_API_KEY!;
const TABLE_ID = process.env.NOCO_DB_TABLE_ID!;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const PAGE_SIZE = 200;
const SKIP_IMAGES = process.argv.includes("--no-images");
const CONCURRENT_DL = 10;

interface BeerLike {
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
}

interface NocoBeer {
  Id: number;
  Название: string;
  Фото: Array<{
    path: string;
    signedPath: string;
    title: string;
    mimetype: string;
  }> | null;
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

type BuiltNocoBeer = {
  beer: BeerLike;
  imageTasks: Array<{ url: string; dest: string }>;
};

async function fetchPage(offset: number): Promise<{ list: NocoBeer[]; totalRows: number }> {
  const url = `${API_URL}/api/v2/tables/${TABLE_ID}/records?limit=${PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url, { headers: { "xc-token": API_KEY } });
  if (!res.ok) throw new Error(`NocoDB ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { list: data.list, totalRows: data.pageInfo?.totalRows ?? 0 };
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

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "true";
}

function normalizeName(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
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

function buildNocoBeer(rec: NocoBeer): BuiltNocoBeer {
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
      const remoteUrl = `${API_URL}/${photo.signedPath}`;

      images.push({ local: localUrl, remote: remoteUrl });

      if (idx === 0) {
        imagePath = localUrl;
        imageRemote = remoteUrl;
      }

      if (!SKIP_IMAGES) {
        imageTasks.push({ url: remoteUrl, dest: localDest });
      }
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

  const matchedIdx = new Set<number>();
  const merged: BeerLike[] = [];
  const imageTasks: Array<{ url: string; dest: string }> = [];

  for (const incoming of incomingBuilt) {
    const incBeer = incoming.beer;
    const byIdHit = byId.get(incBeer.id);
    const byNameHit = byName.get(normalizeName(incBeer.name));
    const hit = byIdHit || byNameHit;

    if (!hit) {
      merged.push(incBeer);
      imageTasks.push(...incoming.imageTasks);
      continue;
    }

    matchedIdx.add(hit.idx);
    const prev = hit.beer;
    const keepImages = hasAnyImages(prev);

    const next: BeerLike = {
      ...incBeer,
      type: prev.type ?? incBeer.type,
      sort: prev.sort ?? incBeer.sort,
      filtration: prev.filtration ?? incBeer.filtration,
      country: prev.country ?? incBeer.country,
      price: prev.price ?? incBeer.price,
      traits: prev.traits ?? incBeer.traits,
      rating: prev.rating ?? incBeer.rating,
      comment: prev.comment ?? incBeer.comment,
      imageVersion: prev.imageVersion ?? incBeer.imageVersion,
    };

    if (keepImages) {
      next.image = prev.image ?? null;
      next.imageRemote = prev.imageRemote ?? null;
      next.images = Array.isArray(prev.images) ? prev.images : [];
      next.imageVersion = prev.imageVersion ?? null;
    } else {
      imageTasks.push(...incoming.imageTasks);
    }

    merged.push(next);
  }

  for (let i = 0; i < existing.length; i += 1) {
    if (!matchedIdx.has(i)) {
      merged.push(existing[i]);
    }
  }

  return { beers: merged, imageTasks };
}

async function downloadBatch(tasks: Array<{ url: string; dest: string }>) {
  let downloaded = 0,
    skipped = 0,
    failed = 0;
  for (let i = 0; i < tasks.length; i += CONCURRENT_DL) {
    const batch = tasks.slice(i, i + CONCURRENT_DL);
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
    if ((i + CONCURRENT_DL) % 100 === 0 || i + CONCURRENT_DL >= tasks.length) {
      console.log(`   Images: ${i + batch.length}/${tasks.length} (dl: ${downloaded}, cached: ${skipped}, err: ${failed})`);
    }
  }
  return { downloaded, skipped, failed };
}

async function main() {
  console.log("🍺 Syncing beers from NocoDB...");
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const allRecords: NocoBeer[] = [];
  let offset = 0;
  let totalRows = 0;

  do {
    const page = await fetchPage(offset);
    totalRows = page.totalRows;
    allRecords.push(...page.list);
    console.log(`   Fetched ${allRecords.length}/${totalRows}`);
    offset += PAGE_SIZE;
  } while (allRecords.length < totalRows);

  const incomingBuilt = allRecords.map((rec) => buildNocoBeer(rec));
  const existing = readCurrentBeers();
  const { beers, imageTasks } = mergeBeers(existing, incomingBuilt);

  fs.writeFileSync(JSON_PATH, JSON.stringify(beers, null, 2));
  console.log(`\n📦 JSON saved: ${beers.length} beers → ${JSON_PATH}`);
  console.log(`   Merge mode: preserve local site data + keep local-only beers`);

  if (!SKIP_IMAGES && imageTasks.length > 0) {
    console.log(`\n🖼  Downloading ${imageTasks.length} images...`);
    const { downloaded, skipped, failed } = await downloadBatch(imageTasks);
    console.log(`   Done: ${downloaded} new, ${skipped} cached, ${failed} failed`);
  }

  console.log("\n✅ Sync complete!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
