import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  const secret = process.env.SYNC_TRIGGER_SECRET;
  if (secret) {
    const body = await req.json().catch(() => ({}));
    if (body.secret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const output = execSync("npx tsx scripts/sync.ts", {
      cwd: process.cwd(),
      timeout: 300_000,
      env: { ...process.env },
    }).toString();

    return NextResponse.json({ ok: true, output });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, output: err.stdout?.toString() },
      { status: 500 }
    );
  }
}
