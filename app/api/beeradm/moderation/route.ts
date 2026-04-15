import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { readModerationSubmissions, reviewModerationSubmission } from "@/lib/beeradm";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = readModerationSubmissions(200);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
    const action = body?.action === "approve" ? "approve" : body?.action === "reject" ? "reject" : null;
    const note = typeof body?.note === "string" ? body.note : undefined;

    if (!submissionId || !action) {
      return NextResponse.json({ error: "submissionId and action are required" }, { status: 400 });
    }

    const result = reviewModerationSubmission({ submissionId, action, note, reviewer: "admin" });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 400 });
  }
}

