import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const fileName = segments.join("/");

    if (fileName.includes("..")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const filePath = path.join(IMAGES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const w = req.nextUrl.searchParams.get("w");
    const q = req.nextUrl.searchParams.get("q");
    const v = req.nextUrl.searchParams.get("v") || "";
    const size = w ? Math.min(parseInt(w), 1200) : null;
    const quality = q ? Math.min(parseInt(q), 90) : 72;

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

    const stat = fs.statSync(filePath);
    const sourceSignature = `${fileName}|${Math.floor(stat.mtimeMs)}|${v}`;
    const signature = crypto.createHash("sha1").update(sourceSignature).digest("hex").slice(0, 12);
    const thumbName = `${path.parse(fileName).name}_${signature}_${size}q${quality}.webp`;
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
  } catch {
    return new NextResponse("Image error", { status: 500 });
  }
}
