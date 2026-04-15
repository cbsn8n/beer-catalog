import { NextRequest, NextResponse } from "next/server";
import { addAuditEntry } from "@/lib/beeradm";
import { getGenerateJobByToken, updateGenerateJob } from "@/lib/beer-image-generate";

function mapStatus(value: unknown) {
  const s = typeof value === "string" ? value.toLowerCase() : "";
  if (s === "succeeded" || s === "success" || s === "done") return "succeeded" as const;
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") return "failed" as const;
  return "pending" as const;
}

function pickResultUrl(payload: any) {
  const candidates = [
    payload?.url,
    payload?.data?.url,
    payload?.result?.url,
    payload?.image?.url,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }

  const lists = [payload?.results, payload?.data?.results, payload?.result?.results];
  for (const arr of lists) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const u = item?.url;
      if (typeof u === "string" && u.trim()) return u.trim();
    }
  }

  return "";
}

async function handle(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const job = getGenerateJobByToken(token);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }

  const payload = await req.json().catch(() => ({}));
  const providerId = payload?.id || payload?.data?.id || payload?.result?.id || undefined;
  const providerTaskId = payload?.task_id || payload?.data?.task_id || payload?.taskId || undefined;
  const status = mapStatus(payload?.status ?? payload?.data?.status ?? payload?.result?.status);
  const resultImageUrl = pickResultUrl(payload) || undefined;
  const error =
    payload?.failure_reason ||
    payload?.data?.failure_reason ||
    payload?.error ||
    payload?.data?.error ||
    undefined;

  const updated = updateGenerateJob(job.jobId, {
    providerId: providerId || job.providerId,
    providerTaskId: providerTaskId || job.providerTaskId,
    status,
    resultImageUrl,
    error,
  });

  addAuditEntry("admin_image_generate_webhook", {
    beerId: job.beerId,
    jobId: job.jobId,
    providerId: providerId || null,
    status,
    hasResult: Boolean(resultImageUrl),
  });

  return NextResponse.json({ ok: true, job: updated || job });
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function GET(req: NextRequest) {
  return handle(req);
}

