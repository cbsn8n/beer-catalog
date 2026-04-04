import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const IMAGES_DIR = path.join(process.cwd(), "data", "images");
const THUMBS_DIR = path.join(process.cwd(), "data", "thumbs");

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
  const width = w ? Math.min(parseInt(w), 800) : null;
  const quality = q ? Math.min(parseInt(q), 90) : 75;

  const filePath = path.join(IMAGES_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  // If no resize requested, serve original
  if (!width) {
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

  // Serve resized WebP thumbnail
  const thumbName = `${path.parse(fileName).name}_${width}q${quality}.webp`;
  const thumbPath = path.join(THUMBS_DIR, thumbName);

  if (!fs.existsSync(THUMBS_DIR)) {
    fs.mkdirSync(THUMBS_DIR, { recursive: true });
  }

  if (!fs.existsSync(thumbPath)) {
    try {
      await sharp(filePath)
        .resize({ height: width, fit: "inside" })
        .webp({ quality })
        .toFile(thumbPath);
    } catch {
      // Fallback to original
      const buffer = fs.readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  const thumb = fs.readFileSync(thumbPath);
  return new NextResponse(thumb, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
