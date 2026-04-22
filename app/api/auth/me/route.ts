import { NextRequest, NextResponse } from "next/server";
import { ensureUserProfile, getUserView } from "@/lib/user-base";
import { getUserFromRequest } from "@/lib/user-auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ user: null });
  ensureUserProfile(user);
  return NextResponse.json({ user: getUserView(user) });
}

