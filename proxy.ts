import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "vana.beer";
const WWW_HOST = "www.vana.beer";

export function proxy(req: NextRequest) {
  const forwardedHost = req.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();

  const rawHost = (forwardedHost || req.nextUrl.hostname || "").toLowerCase();
  const host = rawHost.split(":")[0]?.replace(/\.$/, "") || "";

  if (host === WWW_HOST) {
    const url = req.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.protocol = "https";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
