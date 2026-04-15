import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { addAuditEntry } from "@/lib/beeradm";
import { listBeersWithLocalImages, rotateBeerImages, rotateLocalImage, rotateManyBeers } from "@/lib/beer-images-admin";

function parseDegrees(value: unknown): 90 | -90 {
  return Number(value) === -90 ? -90 : 90;
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listBeersWithLocalImages();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const degrees = parseDegrees(body?.degrees);

    if (action === "rotateImage") {
      const image = typeof body?.image === "string" ? body.image : "";
      if (!image) return NextResponse.json({ error: "image is required" }, { status: 400 });

      await rotateLocalImage(image, degrees);
      addAuditEntry("admin_rotate_image", { image, degrees });
      return NextResponse.json({ ok: true, action, image, degrees });
    }

    if (action === "rotateBeer") {
      const beerId = Number(body?.beerId);
      if (!Number.isFinite(beerId)) {
        return NextResponse.json({ error: "beerId is required" }, { status: 400 });
      }

      const result = await rotateBeerImages(beerId, degrees);
      addAuditEntry("admin_rotate_beer_images", { beerId, degrees, rotated: result.rotated });
      return NextResponse.json({ ok: true, action, beerId, degrees, ...result });
    }

    if (action === "rotateManyBeers") {
      const ids = Array.isArray(body?.beerIds) ? body.beerIds.map((x: unknown) => Number(x)).filter(Number.isFinite) : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: "beerIds is required" }, { status: 400 });
      }

      const result = await rotateManyBeers(ids, degrees);
      addAuditEntry("admin_rotate_many_beers", { count: ids.length, degrees, rotated: result.rotated });
      return NextResponse.json({ ok: true, action, degrees, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}

