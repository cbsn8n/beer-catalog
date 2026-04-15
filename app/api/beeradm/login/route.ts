import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, getAdminCookieOptions } from "@/lib/admin-auth";
import { addAuditEntry } from "@/lib/beeradm";

export async function POST(req: NextRequest) {
  const ADMIN_PASSWORD = process.env.ADMIN_PANEL_PASSWORD;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "ADMIN_PANEL_PASSWORD is not configured" },
      { status: 500 }
    );
  }

  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "JWT_SECRET is not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || password !== ADMIN_PASSWORD) {
    addAuditEntry("admin_login_failed");
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  addAuditEntry("admin_login_success");

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), getAdminCookieOptions());
  return res;
}
