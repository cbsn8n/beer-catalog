import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = "vana.beer";
const WWW_HOST = "www.vana.beer";

export function proxy(req: NextRequest) {
  const host = req.nextUrl.hostname.toLowerCase();

  if (host === WWW_HOST) {
    const url = req.nextUrl.clone();
    url.hostname = CANONICAL_HOST;
    url.protocol = "https";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
