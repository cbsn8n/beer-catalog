import { NextResponse } from "next/server";
import { annotateBeerImageVersions } from "@/lib/image-versions";
import { listPublicBeers, readBeersData } from "@/lib/beers-store";
import { hydrateBeersWithComputedRatings } from "@/lib/user-base";

export async function GET() {
  try {
    const data = readBeersData();
    if (!data.length) {
      return NextResponse.json({ error: "No data. Run sync first." }, { status: 503 });
    }

    const publicBeers = listPublicBeers(data);
    const payload = annotateBeerImageVersions(hydrateBeersWithComputedRatings(publicBeers));

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
