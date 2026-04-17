import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const IMAGE_VERSIONS_PATH = path.join(ADMIN_DIR, "image-versions.json");

type ImageVersionMap = Record<string, number>;

function ensureAdminDir() {
  if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR, { recursive: true });
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function normalizeLocal(local: string | null | undefined) {
  if (!local) return null;
  const pure = local.split("?")[0] || "";
  if (!pure.startsWith("/data/images/")) return null;
  return pure;
}

function localToAbs(local: string | null | undefined) {
  const normalized = normalizeLocal(local);
  if (!normalized) return null;

  const rel = normalized.replace(/^\/data\/images\//, "");
  const abs = path.join(IMAGES_DIR, rel);
  if (!abs.startsWith(IMAGES_DIR)) return null;
  return abs;
}

function readBeers() {
  return safeReadJson<Beer[]>(JSON_PATH, []);
}

function buildInitialMap(): ImageVersionMap {
  const beers = readBeers();
  const map: ImageVersionMap = {};

  const locals = new Set<string>();
  for (const beer of beers) {
    const main = normalizeLocal(beer.image);
    if (main) locals.add(main);
    if (Array.isArray(beer.images)) {
      for (const img of beer.images) {
        const local = normalizeLocal(img.local);
        if (local) locals.add(local);
      }
    }
  }

  for (const local of locals) {
    const abs = localToAbs(local);
    if (!abs || !fs.existsSync(abs)) continue;
    try {
      const stat = fs.statSync(abs);
      map[local] = Math.floor(stat.mtimeMs);
    } catch {
      // ignore
    }
  }

  return map;
}

function writeMap(map: ImageVersionMap) {
  ensureAdminDir();
  fs.writeFileSync(IMAGE_VERSIONS_PATH, JSON.stringify(map, null, 2));
}

export function ensureImageVersionsInitialized() {
  if (fs.existsSync(IMAGE_VERSIONS_PATH)) return;
  writeMap(buildInitialMap());
}

export function readImageVersionMap(): ImageVersionMap {
  ensureImageVersionsInitialized();
  return safeReadJson<ImageVersionMap>(IMAGE_VERSIONS_PATH, {});
}

export function getImageVersion(local: string | null | undefined): number | null {
  const normalized = normalizeLocal(local);
  if (!normalized) return null;
  const map = readImageVersionMap();
  const v = map[normalized];
  return typeof v === "number" ? v : null;
}

export function setImageVersion(local: string | null | undefined, version = Date.now()) {
  const normalized = normalizeLocal(local);
  if (!normalized) return;
  const map = readImageVersionMap();
  map[normalized] = Math.floor(version);
  writeMap(map);
}

export function annotateBeerImageVersions(beers: Beer[]): Beer[] {
  const map = readImageVersionMap();

  const resolveVersion = (local: string | null | undefined, fallback: number | null | undefined) => {
    const normalized = normalizeLocal(local);
    if (!normalized) return fallback ?? null;

    const fromMap = map[normalized];
    if (typeof fromMap === "number") return fromMap;

    const abs = localToAbs(normalized);
    if (abs && fs.existsSync(abs)) {
      try {
        const stat = fs.statSync(abs);
        const mtime = Math.floor(stat.mtimeMs);
        map[normalized] = mtime;
        return mtime;
      } catch {
        // ignore
      }
    }

    return fallback ?? null;
  };

  return beers.map((beer) => {
    const imageVersion = resolveVersion(beer.image || null, beer.imageVersion ?? null);

    const images = Array.isArray(beer.images)
      ? beer.images.map((img) => ({
          ...img,
          version: resolveVersion(img.local, img.version ?? null),
        }))
      : beer.images;

    return {
      ...beer,
      imageVersion,
      images,
    };
  });
}

