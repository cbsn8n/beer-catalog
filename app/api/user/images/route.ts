import { NextRequest, NextResponse } from "next/server";
import { rotateLocalImage } from "@/lib/beer-images-admin";
import { addAuditEntry } from "@/lib/beeradm";
import { canUserRotateLocalImage } from "@/lib/user-base";
import { getUserFromRequest } from "@/lib/user-auth";

function parseDegrees(value: unknown): 90 | -90 {
  return Number(value) === -90 ? -90 : 90;
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const degrees = parseDegrees(body?.degrees);

    if (action !== "rotateImage") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const image = typeof body?.image === "string" ? body.image : "";
    if (!image) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    if (!canUserRotateLocalImage(user.id, image)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await rotateLocalImage(image, degrees);
    addAuditEntry("user_rotate_image", { userId: user.id, image, degrees });
    return NextResponse.json({ ok: true, action, image, degrees });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
