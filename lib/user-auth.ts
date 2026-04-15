import crypto from "crypto";
import type { NextRequest } from "next/server";

export const USER_COOKIE_NAME = "beer_user_session";
const USER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface UserSession {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
}

type SessionPayload = {
  role: "user";
  iat: number;
  exp: number;
  user: UserSession;
};

function toBase64Url(value: Buffer | string) {
  const buf = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value + "===".slice((value.length + 3) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required");
  return secret;
}

function signPayload(payloadB64: string) {
  return toBase64Url(crypto.createHmac("sha256", getJwtSecret()).update(payloadB64).digest());
}

export function createUserSessionToken(user: UserSession, nowMs = Date.now()) {
  const payload: SessionPayload = {
    role: "user",
    iat: nowMs,
    exp: nowMs + USER_SESSION_TTL_SECONDS * 1000,
    user,
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const sigB64 = signPayload(payloadB64);
  return `${payloadB64}.${sigB64}`;
}

export function verifyUserSessionToken(token?: string | null): UserSession | null {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadB64, signatureB64] = parts;
    if (!payloadB64 || !signatureB64) return null;

    const expectedSig = signPayload(payloadB64);
    const a = Buffer.from(signatureB64);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(fromBase64Url(payloadB64).toString("utf8")) as SessionPayload;
    if (payload.role !== "user") return null;
    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) return null;
    if (!payload.user || typeof payload.user.id !== "number") return null;

    return payload.user;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(USER_COOKIE_NAME)?.value;
  return verifyUserSessionToken(token);
}

export function getUserCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: USER_SESSION_TTL_SECONDS,
  };
}

