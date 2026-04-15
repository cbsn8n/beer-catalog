import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";
import { getUserFromRequest } from "@/lib/user-auth";
import { addAuditEntry } from "@/lib/beeradm";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const JSON_PATH = path.join(DATA_DIR, "beers.json");

function asNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableNumber(value: unknown, min?: number, max?: number) {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  if (min != null && num < min) return null;
  if (max != null && num > max) return null;
  return num;
}

export async function GET() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      return NextResponse.json({ error: "No data. Run sync first." }, { status: 503 });
    }
    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name = asNullableString(body?.name);

    if (!name) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    const price = asNullableNumber(body?.price, 0);
    const rating = asNullableNumber(body?.rating, 1, 10);
    const comment = asNullableString(body?.comment);

    const traitsRaw = (body?.traits ?? {}) as Record<string, unknown>;
    const traits = {
      socks: Boolean(traitsRaw.socks),
      bitter: Boolean(traitsRaw.bitter),
      sour: Boolean(traitsRaw.sour),
      fruity: Boolean(traitsRaw.fruity),
      smoked: Boolean(traitsRaw.smoked),
      watery: Boolean(traitsRaw.watery),
      spirity: Boolean(traitsRaw.spirity),
    };

    const beers = fs.existsSync(JSON_PATH)
      ? (JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as Beer[])
      : [];

    const maxId = beers.reduce((max, beer) => Math.max(max, beer.id || 0), 0);
    const id = maxId + 1;

    const created: Beer = {
      id,
      name,
      image: null,
      imageRemote: asNullableString(body?.imageRemote),
      images: [],
      type: asNullableString(body?.type),
      sort: asNullableString(body?.sort),
      filtration: asNullableString(body?.filtration),
      country: asNullableString(body?.country),
      price,
      traits,
      rating,
      comment,
    };

    beers.push(created);
    fs.writeFileSync(JSON_PATH, JSON.stringify(beers, null, 2));

    addAuditEntry("user_add_beer", {
      userId: user.id,
      username: user.username || null,
      beerId: created.id,
      beerName: created.name,
    });

    return NextResponse.json({ ok: true, beer: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
