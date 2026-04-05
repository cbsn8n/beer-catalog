import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const PAGE_SIZE = 200;
const CONCURRENT_DL = 10;

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "true";
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
    req.on("error", (err) => { file.close(); try { fs.unlinkSync(dest); } catch {} reject(err); });
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
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

export async function POST(req: NextRequest) {
  const secret = process.env.SYNC_TRIGGER_SECRET;
  if (secret) {
    const body = await req.json().catch(() => ({}));
    if (body.secret !== secret) {
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

    const beers: any[] = [];
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
          if (idx === 0) { imagePath = localUrl; imageRemote = remoteUrl; }
          imageTasks.push({ url: remoteUrl, dest: localDest });
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

    // download images
    let downloaded = 0, skipped = 0, failed = 0;
    for (let i = 0; i < imageTasks.length; i += CONCURRENT_DL) {
      const batch = imageTasks.slice(i, i + CONCURRENT_DL);
      const results = await Promise.allSettled(
        batch.map(async ({ url, dest }) => {
          if (fs.existsSync(dest)) { skipped++; return; }
          await downloadFile(url, dest);
          downloaded++;
        })
      );
      for (const r of results) if (r.status === "rejected") failed++;
    }

    return NextResponse.json({
      ok: true,
      beers: beers.length,
      images: { downloaded, skipped, failed },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
