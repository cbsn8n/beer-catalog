import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { addAuditEntry, addModerationSubmission, beerExistsById, isBeerNameExists, type ModerationPayload } from "@/lib/beeradm";
import { setImageVersion } from "@/lib/image-versions";
import { getUserFromRequest } from "@/lib/user-auth";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const UPLOADS_DIR = path.join(IMAGES_DIR, "uploads");
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

function asNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asBool(value: unknown) {
  return value === true || value === "true" || value === "1" || value === 1 || value === "on";
}

function extFromFile(file: File) {
  const mime = file.type || "";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "image/avif") return "avif";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";

  const byName = path.extname(file.name || "").toLowerCase().replace(".", "");
  if (byName && /^[a-z0-9]+$/.test(byName)) return byName;
  return "jpg";
}

async function saveImageUpload(file: File) {
  if (file.size <= 0) return null;
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Файл слишком большой (макс 8MB)");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Можно загрузить только изображение");
  }

  const ext = extFromFile(file);
  const fileName = `u-${Date.now()}-${Math.random().toString(16).slice(2, 8)}.${ext}`;
  const relPath = `uploads/${fileName}`;
  const absPath = path.join(UPLOADS_DIR, relPath.replace(/^uploads\//, ""));

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(absPath, buffer);
  setImageVersion(`/data/images/${relPath}`, Date.now());

  return `/data/images/${relPath}`;
}

async function readInput(req: NextRequest): Promise<{ raw: any; imageLocal: string | null }> {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const imageFile = form.get("imageFile");
    const imageLocal = imageFile instanceof File ? await saveImageUpload(imageFile) : null;

    const raw = {
      kind: form.get("kind"),
      name: form.get("name"),
      country: form.get("country"),
      type: form.get("type"),
      sort: form.get("sort"),
      filtration: form.get("filtration"),
      price: form.get("price"),
      rating: form.get("rating"),
      comment: form.get("comment"),
      imageRemote: form.get("imageRemote"),
      beerId: form.get("beerId"),
      traits: {
        socks: form.get("traits.socks"),
        bitter: form.get("traits.bitter"),
        sour: form.get("traits.sour"),
        fruity: form.get("traits.fruity"),
        smoked: form.get("traits.smoked"),
        watery: form.get("traits.watery"),
        spirity: form.get("traits.spirity"),
      },
    };

    return { raw, imageLocal };
  }

  const raw = await req.json().catch(() => ({}));
  return { raw, imageLocal: asNullableString(raw?.imageLocal) };
}

function parsePayload(
  raw: any,
  imageLocal: string | null
): { ok: true; payload: ModerationPayload } | { ok: false; error: string; status?: number } {
  const kind = raw?.kind;

  if (kind === "new-beer") {
    const name = asNullableString(raw?.name);
    if (!name) return { ok: false, error: "Название обязательно" };

    if (isBeerNameExists(name)) {
      return { ok: false, error: "Пиво с таким названием уже есть в базе", status: 409 };
    }

    const rating = asNullableNumber(raw?.rating);
    if (rating != null && (rating < 1 || rating > 10)) {
      return { ok: false, error: "Оценка должна быть от 1 до 10" };
    }

    const price = asNullableNumber(raw?.price);
    if (price != null && price < 0) {
      return { ok: false, error: "Цена не может быть отрицательной" };
    }

    return {
      ok: true,
      payload: {
        kind: "new-beer",
        name,
        country: asNullableString(raw?.country),
        type: asNullableString(raw?.type),
        sort: asNullableString(raw?.sort),
        filtration: asNullableString(raw?.filtration),
        price,
        rating,
        comment: asNullableString(raw?.comment),
        imageLocal,
        imageRemote: asNullableString(raw?.imageRemote),
        traits: {
          socks: asBool(raw?.traits?.socks),
          bitter: asBool(raw?.traits?.bitter),
          sour: asBool(raw?.traits?.sour),
          fruity: asBool(raw?.traits?.fruity),
          smoked: asBool(raw?.traits?.smoked),
          watery: asBool(raw?.traits?.watery),
          spirity: asBool(raw?.traits?.spirity),
        },
      },
    };
  }

  if (kind === "beer-update") {
    const beerId = Number(raw?.beerId);
    if (!Number.isFinite(beerId)) return { ok: false, error: "Некорректный beerId" };
    if (!beerExistsById(beerId)) return { ok: false, error: "Карточка пива не найдена", status: 404 };

    const rating = asNullableNumber(raw?.rating);
    if (rating != null && (rating < 1 || rating > 10)) {
      return { ok: false, error: "Оценка должна быть от 1 до 10" };
    }

    const comment = asNullableString(raw?.comment);
    const imageRemote = asNullableString(raw?.imageRemote);
    if (rating == null && !comment && !imageRemote && !imageLocal) {
      return { ok: false, error: "Добавьте хотя бы одно изменение" };
    }

    return {
      ok: true,
      payload: {
        kind: "beer-update",
        beerId,
        rating,
        comment,
        imageLocal,
        imageRemote,
      },
    };
  }

  return { ok: false, error: "Некорректный тип заявки" };
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { raw, imageLocal } = await readInput(req);
    const parsed = parsePayload(raw, imageLocal);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status || 400 });
    }

    const submission = addModerationSubmission({
      user: {
        id: user.id,
        first_name: user.first_name,
        username: user.username,
      },
      payload: parsed.payload,
    });

    addAuditEntry("user_submission_created", {
      submissionId: submission.id,
      kind: submission.payload.kind,
      userId: user.id,
      username: user.username || null,
    });

    return NextResponse.json({ ok: true, submissionId: submission.id, status: submission.status });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
