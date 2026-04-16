import { NextRequest, NextResponse } from "next/server";

function getPublicBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(req: NextRequest) {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "";
  const hasBotToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const base = getPublicBaseUrl(req);
  const authUrl = new URL("/auth/telegram/callback", `${base}/`).toString();

  return NextResponse.json(
    {
      botUsername,
      authUrl,
      configured: Boolean(botUsername && hasBotToken),
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
