import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUserView, updateUserProfileMedia } from "@/lib/user-base";
import { getUserFromRequest } from "@/lib/user-auth";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const USERS_DIR = path.join(IMAGES_DIR, "users");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function extFromFile(file: File) {
  const mime = file.type || "";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";

  const byName = path.extname(file.name || "").toLowerCase().replace(".", "");
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  return "jpg";
}

async function saveProfileImage(userId: number, kind: "avatar" | "hero", file: File) {
  if (file.size <= 0) return null;
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Файл слишком большой (макс 8MB)");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Можно загрузить только изображение");
  }

  const ext = extFromFile(file);
  const fileName = `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  const relPath = `users/${userId}/${fileName}`;
  const absPath = path.join(USERS_DIR, String(userId), fileName);

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absPath, buffer);

  return `/data/images/${relPath}`;
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user: getUserView(user) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const avatarFile = form.get("avatarFile");
    const heroFile = form.get("heroFile");

    const avatarLocal = avatarFile instanceof File ? await saveProfileImage(user.id, "avatar", avatarFile) : undefined;
    const heroLocal = heroFile instanceof File ? await saveProfileImage(user.id, "hero", heroFile) : undefined;

    if (avatarLocal === undefined && heroLocal === undefined) {
      return NextResponse.json({ error: "Нужно загрузить аватар или фон" }, { status: 400 });
    }

    updateUserProfileMedia({
      user,
      customAvatarLocal: avatarLocal,
      heroImageLocal: heroLocal,
    });

    return NextResponse.json({ ok: true, user: getUserView(user) });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
