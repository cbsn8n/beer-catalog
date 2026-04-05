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
const DATA_DIR = path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const PAGE_SIZE = 200;
const SKIP_IMAGES = process.argv.includes("--no-images");
const CONCURRENT_DL = 10;

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
        try { fs.unlinkSync(dest); } catch {}
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    });
    req.on("error", (err) => {
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      reject(err);
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "true";
}

async function downloadBatch(tasks: Array<{ url: string; dest: string }>) {
  let downloaded = 0, skipped = 0, failed = 0;
  for (let i = 0; i < tasks.length; i += CONCURRENT_DL) {
    const batch = tasks.slice(i, i + CONCURRENT_DL);
    const results = await Promise.allSettled(
      batch.map(async ({ url, dest }) => {
        if (fs.existsSync(dest)) { skipped++; return; }
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

  const beers = [] as any[];
  const imageTasks: Array<{ url: string; dest: string }> = [];

  for (const rec of allRecords) {
    let imagePath: string | null = null;
    let imageRemote: string | null = null;
    const images: { local: string | null; remote: string | null }[] = [];

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

    beers.push({
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
    });
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(beers, null, 2));
  console.log(`\n📦 JSON saved: ${beers.length} beers → ${JSON_PATH}`);

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
