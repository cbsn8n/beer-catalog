import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";
import { setImageVersion } from "@/lib/image-versions";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const JSON_PATH = path.join(DATA_DIR, "beers.json");

function readBeers(): Beer[] {
  if (!fs.existsSync(JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as Beer[];
}

function writeBeers(beers: Beer[]) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(beers, null, 2));
}

function extFromUrl(url: string) {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "";
    }
  })();

  const ext = path.extname(pathname).toLowerCase().replace(".", "");
  if (["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return "jpg";
}

function extFromContentType(contentType: string | null) {
  if (!contentType) return null;
  const ct = contentType.toLowerCase();
  if (ct.includes("image/jpeg")) return "jpg";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/gif")) return "gif";
  if (ct.includes("image/avif")) return "avif";
  return null;
}

async function downloadImageToLocal(beerId: number, imageUrl: string) {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": "BeervanaAdmin/1.0" },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`Image download failed: HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.toLowerCase().startsWith("image/")) {
    throw new Error("Selected URL is not an image");
  }

  const arr = await res.arrayBuffer();
  const buffer = Buffer.from(arr);
  if (buffer.length === 0) {
    throw new Error("Downloaded image is empty");
  }
  if (buffer.length > 12 * 1024 * 1024) {
    throw new Error("Image is too large (max 12MB)");
  }

  const ext = extFromContentType(contentType) || extFromUrl(imageUrl);
  const relDir = "admin-picked";
  const fileName = `beer-${beerId}-${Date.now()}.${ext}`;
  const absDir = path.join(IMAGES_DIR, relDir);
  const absPath = path.join(absDir, fileName);
  fs.mkdirSync(absDir, { recursive: true });
  fs.writeFileSync(absPath, buffer);

  const localUrl = `/data/images/${relDir}/${fileName}`;
  setImageVersion(localUrl, Date.now());
  return localUrl;
}

function prependImage(beer: Beer, local: string | null, remote: string | null) {
  const existing = Array.isArray(beer.images) ? [...beer.images] : [];

  const filtered = existing.filter((img) => {
    if (local && img.local === local) return false;
    if (remote && img.remote === remote) return false;
    return true;
  });

  filtered.unshift({ local, remote, version: local ? Date.now() : null });
  beer.images = filtered;

  beer.image = local;
  beer.imageVersion = local ? Date.now() : null;
  beer.imageRemote = remote;
}

export async function setBeerPrimaryImageFromRemote(beerId: number, imageUrl: string) {
  const beers = readBeers();
  const idx = beers.findIndex((b) => b.id === beerId);
  if (idx === -1) {
    throw new Error("Beer not found");
  }

  const localUrl = await downloadImageToLocal(beerId, imageUrl);
  const beer = beers[idx];

  prependImage(beer, localUrl, imageUrl);
  beers[idx] = beer;
  writeBeers(beers);

  return {
    beerId,
    beerName: beer.name,
    localUrl,
    remoteUrl: imageUrl,
  };
}

