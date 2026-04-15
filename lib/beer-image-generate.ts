import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const JOBS_PATH = path.join(ADMIN_DIR, "image-generate-jobs.json");

export const DEFAULT_GENERATE_MODEL = "gpt-image-1.5";
export const REGENERATE_MODEL = "nano-banana";

export const GENERATE_PROMPT =
  "Transform the input image into a clean professional studio product photo of the same beer package on a pure white background (#FFFFFF). The subject may be either a can or a bottle. Keep the exact original packaging design fully unchanged: do not alter, redraw, simplify, restyle, translate, replace, distort, or invent any label details, typography, branding, logo, colors, graphics, proportions, cap, neck, pull tab, reflections specific to the package, or any printed text. Preserve the product exactly as in the source image. Reposition the product into a straight side view, centered vertically, with realistic geometry and no perspective distortion. The final result must look like a high-end commercial packshot photographed in a professional studio: sharp focus, accurate shape, natural materials, realistic edges, clean cutout, soft minimal shadow under the product, even lighting, no background texture, no props, no hands, no table, no environment. Output only one isolated product on a solid white background (#FFFFFF), with the package shown clearly from the side, clean, realistic, undamaged, and visually identical to the original item except for the corrected angle and background.";

export type GenerationStatus = "pending" | "succeeded" | "failed";

export interface ImageGenerateJob {
  jobId: string;
  beerId: number;
  sourceImageUrl: string;
  model: string;
  prompt: string;
  status: GenerationStatus;
  providerId?: string;
  providerTaskId?: string;
  resultImageUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  lastPolledAt?: string;
  webhookToken: string;
}

type DrawResultPayload = {
  code?: number;
  data?: {
    id?: string;
    task_id?: string;
    status?: string;
    url?: string;
    error?: string;
    failure_reason?: string;
    results?: Array<{ url?: string }>;
  };
  msg?: string;
};

function ensureAdminDir() {
  if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR, { recursive: true });
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJobs(items: ImageGenerateJob[]) {
  ensureAdminDir();
  fs.writeFileSync(JOBS_PATH, JSON.stringify(items, null, 2));
}

function readJobs() {
  return safeReadJson<ImageGenerateJob[]>(JOBS_PATH, []);
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createGenerateJob(input: {
  beerId: number;
  sourceImageUrl: string;
  model: string;
  prompt: string;
  providerId?: string;
  providerTaskId?: string;
  status: GenerationStatus;
  resultImageUrl?: string;
  error?: string;
}) {
  const items = readJobs();
  const createdAt = nowIso();
  const job: ImageGenerateJob = {
    jobId: randomId("imgjob"),
    beerId: input.beerId,
    sourceImageUrl: input.sourceImageUrl,
    model: input.model,
    prompt: input.prompt,
    providerId: input.providerId,
    providerTaskId: input.providerTaskId,
    status: input.status,
    resultImageUrl: input.resultImageUrl,
    error: input.error,
    createdAt,
    updatedAt: createdAt,
    webhookToken: randomId("hook"),
  };

  items.unshift(job);
  writeJobs(items.slice(0, 300));
  return job;
}

export function getLatestGenerateJobForBeer(beerId: number) {
  const items = readJobs();
  return items.find((x) => x.beerId === beerId) || null;
}

export function getGenerateJobByToken(token: string) {
  const items = readJobs();
  return items.find((x) => x.webhookToken === token) || null;
}

export function getGenerateJobById(jobId: string) {
  const items = readJobs();
  return items.find((x) => x.jobId === jobId) || null;
}

export function updateGenerateJob(jobId: string, patch: Partial<ImageGenerateJob>) {
  const items = readJobs();
  const idx = items.findIndex((x) => x.jobId === jobId);
  if (idx === -1) return null;

  const next: ImageGenerateJob = {
    ...items[idx],
    ...patch,
    updatedAt: nowIso(),
  };
  items[idx] = next;
  writeJobs(items);
  return next;
}

function extractResultUrl(data?: DrawResultPayload["data"]) {
  if (!data) return "";
  if (typeof data.url === "string" && data.url.trim()) return data.url.trim();
  if (Array.isArray(data.results)) {
    for (const item of data.results) {
      const u = item?.url;
      if (typeof u === "string" && u.trim()) return u.trim();
    }
  }
  return "";
}

function mapProviderStatus(status: string | undefined): GenerationStatus {
  const s = (status || "").toLowerCase();
  if (s === "succeeded" || s === "success" || s === "done") return "succeeded";
  if (s === "failed" || s === "error" || s === "cancelled" || s === "canceled") return "failed";
  return "pending";
}

function canPoll(job: ImageGenerateJob) {
  if (job.status !== "pending") return false;
  if (!job.providerId) return false;
  if (!job.lastPolledAt) return true;

  const prev = new Date(job.lastPolledAt).getTime();
  if (!Number.isFinite(prev)) return true;
  return Date.now() - prev > 8000;
}

export async function pollGenerateJobIfNeeded(job: ImageGenerateJob) {
  if (!canPoll(job)) return job;

  const apiKey = process.env.GRSAI_API_KEY;
  if (!apiKey) return job;

  const req = await fetch("https://grsai.dakka.com.cn/v1/draw/result", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ id: job.providerId }),
  });

  const payload = (await req.json().catch(() => null)) as DrawResultPayload | null;
  if (!payload || payload.code !== 0 || !payload.data) {
    return updateGenerateJob(job.jobId, { lastPolledAt: nowIso() }) || job;
  }

  const status = mapProviderStatus(payload.data.status);
  const resultImageUrl = extractResultUrl(payload.data);
  const error = payload.data.failure_reason || payload.data.error || undefined;

  return (
    updateGenerateJob(job.jobId, {
      status,
      resultImageUrl: resultImageUrl || undefined,
      providerTaskId: payload.data.task_id || job.providerTaskId,
      error,
      lastPolledAt: nowIso(),
    }) || job
  );
}

