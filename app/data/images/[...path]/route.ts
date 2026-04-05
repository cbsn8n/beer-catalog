import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const IMAGES_DIR = path.join(process.cwd(), "data", "images");
const THUMBS_DIR = path.join(process.cwd(), "data", "thumbs");
const BEERS_JSON = path.join(process.cwd(), "data", "beers.json");

async function ensureLocalImage(fileName: string): Promise<string | null> {
  const filePath = path.join(IMAGES_DIR, fileName);
  if (fs.existsSync(filePath)) return filePath;

  if (!fs.existsSync(BEERS_JSON)) return null;
  const beers = JSON.parse(fs.readFileSync(BEERS_JSON, "utf-8"));
  const numericId = Number.parseInt(path.parse(fileName).name, 10);
  const beer = beers.find((b: any) => b.id === numericId);
  const remote = beer?.imageRemote;
  if (!remote) return null;

  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const res = await fetch(remote);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const fileName = segments.join("/");

  if (fileName.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const w = req.nextUrl.searchParams.get("w");
  const q = req.nextUrl.searchParams.get("q");
  const size = w ? Math.min(parseInt(w), 800) : null;
  const quality = q ? Math.min(parseInt(q), 90) : 72;

  const filePath = await ensureLocalImage(fileName);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  if (!size) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  const thumbName = `${path.parse(fileName).name}_${size}q${quality}.webp`;
  const thumbPath = path.join(THUMBS_DIR, thumbName);

  if (!fs.existsSync(thumbPath)) {
    await sharp(filePath)
      .resize({ height: size, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toFile(thumbPath);
  }

  const thumb = fs.readFileSync(thumbPath);
  return new NextResponse(thumb, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
