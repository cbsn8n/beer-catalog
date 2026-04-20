import { NextRequest, NextResponse } from "next/server";
import { annotateBeerImageVersions } from "@/lib/image-versions";
import { getUserBaseBeers } from "@/lib/user-base";
import { getUserFromRequest } from "@/lib/user-auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const beers = annotateBeerImageVersions(getUserBaseBeers(user.id));

  return NextResponse.json(
    {
      user,
      beers,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
