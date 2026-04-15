import crypto from "crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "beeradm_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

type SessionPayload = {
  role: "admin";
  iat: number;
  exp: number;
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
  if (!secret) {
    throw new Error("JWT_SECRET is required for admin auth");
  }
  return secret;
}

function signPayload(payloadB64: string) {
  return toBase64Url(crypto.createHmac("sha256", getJwtSecret()).update(payloadB64).digest());
}

export function createAdminSessionToken(nowMs = Date.now()) {
  const payload: SessionPayload = {
    role: "admin",
    iat: nowMs,
    exp: nowMs + SESSION_TTL_SECONDS * 1000,
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const sigB64 = signPayload(payloadB64);

  return `${payloadB64}.${sigB64}`;
}

export function verifyAdminSessionToken(token?: string | null) {
  try {
    if (!token) return false;

    const parts = token.split(".");
    if (parts.length !== 2) return false;

    const [payloadB64, signatureB64] = parts;
    if (!payloadB64 || !signatureB64) return false;

    const expectedSig = signPayload(payloadB64);
    const a = Buffer.from(signatureB64);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;

    const payload = JSON.parse(fromBase64Url(payloadB64).toString("utf8")) as SessionPayload;
    if (payload.role !== "admin") return false;
    if (typeof payload.exp !== "number") return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function isAdminRequest(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
