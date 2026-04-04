import { NextRequest } from "next/server";

const COLORS = [
  ["#F59E0B", "#D97706"], // amber
  ["#92400E", "#78350F"], // dark brown
  ["#CA8A04", "#A16207"], // gold
  ["#DC2626", "#B91C1C"], // red ale
  ["#1E3A5F", "#0F172A"], // stout
  ["#65A30D", "#4D7C0F"], // ipa green
  ["#EA580C", "#C2410C"], // copper
  ["#7C3AED", "#6D28D9"], // purple special
];

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") || "Beer";
  const id = req.nextUrl.searchParams.get("id") || "0";
  const colorIdx = parseInt(id) % COLORS.length;
  const [c1, c2] = COLORS[colorIdx];

  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${c2}" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" fill="url(#bg)"/>
  
  <!-- Beer glass -->
  <rect x="105" y="100" width="90" height="160" rx="8" fill="url(#glass)" opacity="0.6"/>
  <rect x="110" y="105" width="80" height="30" rx="4" fill="white" opacity="0.4"/>
  <!-- Handle -->
  <rect x="195" y="140" width="12" height="80" rx="6" fill="url(#glass)" opacity="0.4"/>
  
  <!-- Bubbles -->
  <circle cx="130" cy="220" r="4" fill="white" opacity="0.3"/>
  <circle cx="155" cy="200" r="3" fill="white" opacity="0.25"/>
  <circle cx="170" cy="230" r="3.5" fill="white" opacity="0.2"/>
  <circle cx="140" cy="180" r="2.5" fill="white" opacity="0.3"/>
  
  <!-- Name initials -->
  <text x="150" y="320" text-anchor="middle" font-family="system-ui,sans-serif" font-size="32" font-weight="700" fill="${c2}" opacity="0.7">${initials}</text>
  
  <!-- Name -->
  <text x="150" y="355" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="${c2}" opacity="0.5">${escapeXml(name.length > 25 ? name.slice(0, 25) + "…" : name)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
