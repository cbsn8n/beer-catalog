import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const JSON_PATH = path.join(DATA_DIR, "beers.json");
const IMAGES_DIR = path.join(DATA_DIR, "images");

function localUrlToAbs(localUrl: string | null | undefined) {
  if (!localUrl) return null;
  const [pure] = localUrl.split("?");
  if (!pure.startsWith("/data/images/")) return null;

  const rel = pure.replace(/^\/data\/images\//, "");
  const abs = path.join(IMAGES_DIR, rel);
  if (!abs.startsWith(IMAGES_DIR)) return null;
  return abs;
}

function getImageVersion(localUrl: string | null | undefined) {
  const abs = localUrlToAbs(localUrl);
  if (!abs) return null;
  try {
    const stat = fs.statSync(abs);
    return Math.floor(stat.mtimeMs);
  } catch {
    return null;
  }
}

function withVersions(beers: Beer[]): Beer[] {
  return beers.map((beer) => {
    const imageVersion = getImageVersion(beer.image);
    const images = Array.isArray(beer.images)
      ? beer.images.map((img) => ({
          ...img,
          version: getImageVersion(img.local),
        }))
      : beer.images;

    return {
      ...beer,
      imageVersion,
      images,
    };
  });
}

export async function GET() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      return NextResponse.json({ error: "No data. Run sync first." }, { status: 503 });
    }

    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as Beer[];
    const payload = withVersions(data);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
