import { NextRequest, NextResponse } from "next/server";
import { addAuditEntry, addModerationSubmission, beerExistsById, isBeerNameExists, type ModerationPayload } from "@/lib/beeradm";
import { getUserFromRequest } from "@/lib/user-auth";

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

function parsePayload(raw: any): { ok: true; payload: ModerationPayload } | { ok: false; error: string; status?: number } {
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
        imageRemote: asNullableString(raw?.imageRemote),
        traits: {
          socks: Boolean(raw?.traits?.socks),
          bitter: Boolean(raw?.traits?.bitter),
          sour: Boolean(raw?.traits?.sour),
          fruity: Boolean(raw?.traits?.fruity),
          smoked: Boolean(raw?.traits?.smoked),
          watery: Boolean(raw?.traits?.watery),
          spirity: Boolean(raw?.traits?.spirity),
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
    if (rating == null && !comment && !imageRemote) {
      return { ok: false, error: "Добавьте хотя бы одно изменение" };
    }

    return {
      ok: true,
      payload: {
        kind: "beer-update",
        beerId,
        rating,
        comment,
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
    const raw = await req.json().catch(() => ({}));
    const parsed = parsePayload(raw);
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

