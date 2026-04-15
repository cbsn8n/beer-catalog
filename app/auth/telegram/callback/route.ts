import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { USER_COOKIE_NAME, createUserSessionToken, getUserCookieOptions, type UserSession } from "@/lib/user-auth";

function verifyTelegramAuth(params: URLSearchParams, botToken: string) {
  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "missing-hash" } as const;

  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    entries.push(`${key}=${value}`);
  });
  entries.sort();
  const dataCheckString = entries.join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(hash, "utf8");
  const b = Buffer.from(expectedHash, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: "invalid-hash" } as const;
  }

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, reason: "invalid-auth-date" } as const;
  }

  // Telegram login data should be fresh.
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - authDate) > 60 * 60 * 24) {
    return { ok: false, reason: "stale-auth-date" } as const;
  }

  return { ok: true } as const;
}

export async function GET(req: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    const failUrl = new URL("/login?error=telegram-not-configured", req.url);
    return NextResponse.redirect(failUrl);
  }

  const params = new URL(req.url).searchParams;
  const result = verifyTelegramAuth(params, botToken);

  if (!result.ok) {
    const failUrl = new URL(`/login?error=${encodeURIComponent(result.reason)}`, req.url);
    return NextResponse.redirect(failUrl);
  }

  const id = Number(params.get("id"));
  const firstName = params.get("first_name") || "User";
  if (!Number.isFinite(id)) {
    const failUrl = new URL("/login?error=invalid-user", req.url);
    return NextResponse.redirect(failUrl);
  }

  const user: UserSession = {
    id,
    first_name: firstName,
    last_name: params.get("last_name") || undefined,
    username: params.get("username") || undefined,
    photo_url: params.get("photo_url") || undefined,
    auth_date: Number(params.get("auth_date")) || Math.floor(Date.now() / 1000),
  };

  const token = createUserSessionToken(user);
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(USER_COOKIE_NAME, token, getUserCookieOptions());
  return res;
}

