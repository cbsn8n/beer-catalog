import { NextRequest, NextResponse } from "next/server";
import { getUserView } from "@/lib/user-base";
import { getUserFromRequest } from "@/lib/user-auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: getUserView(user) });
}

