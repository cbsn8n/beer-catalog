import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";
import { annotateBeerImageVersions } from "@/lib/image-versions";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const JSON_PATH = path.join(DATA_DIR, "beers.json");

export async function GET() {
  try {
    if (!fs.existsSync(JSON_PATH)) {
      return NextResponse.json({ error: "No data. Run sync first." }, { status: 503 });
    }

    const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as Beer[];
    const payload = annotateBeerImageVersions(data);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
