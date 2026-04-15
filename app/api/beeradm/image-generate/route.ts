import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { addAuditEntry } from "@/lib/beeradm";
import {
  createGenerateJob,
  DEFAULT_GENERATE_MODEL,
  GENERATE_PROMPT,
  getLatestGenerateJobForBeer,
  pollGenerateJobIfNeeded,
  REGENERATE_MODEL,
  updateGenerateJob,
} from "@/lib/beer-image-generate";

const DRAW_COMPLETIONS_URL = "https://grsai.dakka.com.cn/v1/draw/completions";

function asString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function getPublicBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/$/, "");

  const fHost = req.headers.get("x-forwarded-host");
  if (fHost) {
    const fProto = req.headers.get("x-forwarded-proto") || "https";
    return `${fProto}://${fHost}`;
  }

  const host = req.headers.get("host") || new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "") || "https";
  return `${proto}://${host}`;
}

function toAbsoluteImageUrl(value: string, req: NextRequest) {
  if (/^https?:\/\//i.test(value)) return value;
  const base = getPublicBaseUrl(req);
  return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}

async function startProviderJob(req: NextRequest, input: {
  model: string;
  sourceImageUrl: string;
  prompt: string;
  webhookUrl: string;
}) {
  const apiKey = process.env.GRSAI_API_KEY;
  if (!apiKey) throw new Error("GRSAI_API_KEY is not configured");

  const payload = {
    model: input.model,
    prompt: input.prompt,
    size: "1:1",
    variants: 1,
    image: toAbsoluteImageUrl(input.sourceImageUrl, req),
    webhook: input.webhookUrl,
    webhook_url: input.webhookUrl,
    callback_url: input.webhookUrl,
  };

  const res = await fetch(DRAW_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Generate request failed: HTTP ${res.status}${txt ? ` - ${txt.slice(0, 200)}` : ""}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let providerId = "";
  let providerTaskId = "";
  let resultImageUrl = "";
  let status = "pending";
  let error = "";

  try {
    for (let i = 0; i < 8; i += 1) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        const text = line.trim();
        if (!text.startsWith("data:")) continue;

        const jsonText = text.slice(5).trim();
        if (!jsonText.startsWith("{")) continue;

        try {
          const obj = JSON.parse(jsonText) as {
            id?: string;
            task_id?: string;
            status?: string;
            url?: string;
            error?: string;
            failure_reason?: string;
            results?: Array<{ url?: string }>;
          };

          if (obj.id) providerId = obj.id;
          if (obj.task_id) providerTaskId = obj.task_id;
          if (obj.url) resultImageUrl = obj.url;
          if (!resultImageUrl && Array.isArray(obj.results)) {
            for (const r of obj.results) {
              if (r?.url) {
                resultImageUrl = r.url;
                break;
              }
            }
          }

          const s = (obj.status || "").toLowerCase();
          if (s === "succeeded" || s === "success" || s === "done") status = "succeeded";
          else if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") status = "failed";
          else status = "pending";

          if (obj.failure_reason || obj.error) error = obj.failure_reason || obj.error || "";
        } catch {
          // ignore invalid partial chunk
        }
      }

      if (providerId) break;
    }
  } finally {
    try {
      reader.cancel();
    } catch {
      // ignore
    }
  }

  if (!providerId) {
    throw new Error("Provider did not return job id");
  }

  return {
    providerId,
    providerTaskId: providerTaskId || undefined,
    status: status as "pending" | "succeeded" | "failed",
    resultImageUrl: resultImageUrl || undefined,
    error: error || undefined,
  };
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const beerId = Number(req.nextUrl.searchParams.get("beerId"));
  if (!Number.isFinite(beerId)) {
    return NextResponse.json({ error: "beerId is required" }, { status: 400 });
  }

  const job = getLatestGenerateJobForBeer(beerId);
  if (!job) {
    return NextResponse.json({ ok: true, job: null });
  }

  const synced = await pollGenerateJobIfNeeded(job);
  return NextResponse.json({ ok: true, job: synced });
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let draftJobId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    const beerId = Number(body?.beerId);
    const sourceImageUrl = asString(body?.sourceImageUrl);

    if (!Number.isFinite(beerId) || !sourceImageUrl) {
      return NextResponse.json({ error: "beerId and sourceImageUrl are required" }, { status: 400 });
    }

    const mode = asString(body?.mode);
    const model = mode === "regenerate" ? REGENERATE_MODEL : (asString(body?.model) || DEFAULT_GENERATE_MODEL);
    const prompt = GENERATE_PROMPT;

    // Create pending job first to obtain webhook token/url.
    const draft = createGenerateJob({
      beerId,
      sourceImageUrl,
      model,
      prompt,
      status: "pending",
    });
    draftJobId = draft.jobId;

    const webhookBase = getPublicBaseUrl(req);
    const webhookUrl = `${webhookBase}/api/beeradm/image-generate/webhook?token=${encodeURIComponent(draft.webhookToken)}`;

    const provider = await startProviderJob(req, {
      model,
      sourceImageUrl,
      prompt,
      webhookUrl,
    });

    const updated =
      updateGenerateJob(draft.jobId, {
        providerId: provider.providerId,
        providerTaskId: provider.providerTaskId,
        status: provider.status,
        resultImageUrl: provider.resultImageUrl,
        error: provider.error,
      }) || draft;

    addAuditEntry("admin_image_generate_started", {
      beerId,
      model,
      providerId: updated.providerId || null,
      status: updated.status,
    });

    return NextResponse.json({ ok: true, job: updated });
  } catch (err: any) {
    if (draftJobId) {
      updateGenerateJob(draftJobId, {
        status: "failed",
        error: err?.message || "Unknown error",
      });
    }
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
