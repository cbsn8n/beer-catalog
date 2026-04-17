import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { Beer } from "@/lib/types";
import { getImageVersion, setImageVersion } from "@/lib/image-versions";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
const JSON_PATH = path.join(DATA_DIR, "beers.json");

export interface BeerImageAdminSummary {
  id: number;
  name: string;
  country: string | null;
  sort: string | null;
  preview: string | null;
  previewVersion: number | null;
  localImages: string[];
  suspicious: boolean;
}

function readBeers(): Beer[] {
  if (!fs.existsSync(JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as Beer[];
}

function normalizeLocalUrl(local: string) {
  const [urlPath] = local.split("?");
  return urlPath;
}

function collectBeerLocalImages(beer: Beer) {
  const set = new Set<string>();

  if (beer.image && beer.image.startsWith("/data/images/")) {
    set.add(normalizeLocalUrl(beer.image));
  }

  if (Array.isArray(beer.images)) {
    for (const img of beer.images) {
      if (img.local && img.local.startsWith("/data/images/")) {
        set.add(normalizeLocalUrl(img.local));
      }
    }
  }

  return Array.from(set);
}

function localUrlToAbsPath(localUrl: string) {
  const normalized = normalizeLocalUrl(localUrl);
  if (!normalized.startsWith("/data/images/")) return null;

  const relative = normalized.replace(/^\/data\/images\//, "");
  const absPath = path.join(IMAGES_DIR, relative);

  if (!absPath.startsWith(IMAGES_DIR)) return null;
  return absPath;
}

async function isSuspiciousLocal(localUrl: string) {
  const abs = localUrlToAbsPath(localUrl);
  if (!abs || !fs.existsSync(abs)) return false;

  try {
    const meta = await sharp(abs).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (!width || !height) return false;

    // Heuristic: bottle images are usually portrait.
    return width > height * 1.08;
  } catch {
    return false;
  }
}

function invalidateThumbCacheForLocal(localUrl: string) {
  const abs = localUrlToAbsPath(localUrl);
  if (!abs) return;

  const base = path.parse(abs).name;
  if (!fs.existsSync(THUMBS_DIR)) return;

  const files = fs.readdirSync(THUMBS_DIR);
  for (const file of files) {
    if (file.startsWith(`${base}_`) && file.endsWith(".webp")) {
      try {
        fs.unlinkSync(path.join(THUMBS_DIR, file));
      } catch {
        // ignore
      }
    }
  }
}

export async function listBeersWithLocalImages(): Promise<BeerImageAdminSummary[]> {
  const beers = readBeers();

  const items = await Promise.all(
    beers.map(async (beer) => {
      const localImages = collectBeerLocalImages(beer);
      const suspiciousFlags = await Promise.all(localImages.map((img) => isSuspiciousLocal(img)));
      const suspicious = suspiciousFlags.some(Boolean);

      return {
        id: beer.id,
        name: beer.name,
        country: beer.country,
        sort: beer.sort,
        preview: localImages[0] || beer.image || beer.imageRemote || null,
        previewVersion: getImageVersion(localImages[0] || beer.image || null),
        localImages,
        suspicious,
      };
    })
  );

  return items.sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export async function rotateLocalImage(localUrl: string, degrees: 90 | -90 = 90) {
  const absPath = localUrlToAbsPath(localUrl);
  if (!absPath || !fs.existsSync(absPath)) {
    throw new Error("Image not found");
  }

  const tmpPath = `${absPath}.tmp-${Date.now()}`;
  await sharp(absPath).rotate(degrees).toFile(tmpPath);
  fs.renameSync(tmpPath, absPath);
  setImageVersion(localUrl, Date.now());
  invalidateThumbCacheForLocal(localUrl);
}

export async function rotateBeerImages(beerId: number, degrees: 90 | -90 = 90) {
  const beers = readBeers();
  const beer = beers.find((b) => b.id === beerId);
  if (!beer) throw new Error("Beer not found");

  const images = collectBeerLocalImages(beer);
  let rotated = 0;

  for (const img of images) {
    await rotateLocalImage(img, degrees);
    rotated += 1;
  }

  return { rotated, images };
}

export async function rotateManyBeers(beerIds: number[], degrees: 90 | -90 = 90) {
  let rotated = 0;
  const details: Array<{ beerId: number; rotated: number }> = [];

  for (const beerId of beerIds) {
    const result = await rotateBeerImages(beerId, degrees);
    rotated += result.rotated;
    details.push({ beerId, rotated: result.rotated });
  }

  return { rotated, details };
}
