import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";
import type { UserSession } from "@/lib/user-auth";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
const BEERS_JSON_PATH = path.join(DATA_DIR, "beers.json");
const SYNC_HISTORY_PATH = path.join(ADMIN_DIR, "sync-history.json");
const AUDIT_LOG_PATH = path.join(ADMIN_DIR, "audit.log");
const MODERATION_QUEUE_PATH = path.join(ADMIN_DIR, "moderation-queue.json");

export interface SyncHistoryEntry {
  id: string;
  trigger: "admin-session" | "secret";
  status: "success" | "error";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  beers: number;
  images: {
    downloaded: number;
    skipped: number;
    failed: number;
  };
  error?: string;
}

export interface AuditEntry {
  at: string;
  action: string;
  details?: Record<string, unknown>;
}

export type ModerationStatus = "pending" | "approved" | "rejected";

export interface ModerationNewBeerPayload {
  kind: "new-beer";
  name: string;
  country: string | null;
  type: string | null;
  sort: string | null;
  filtration: string | null;
  price: number | null;
  rating: number | null;
  comment: string | null;
  imageRemote: string | null;
  traits: Beer["traits"];
}

export interface ModerationBeerUpdatePayload {
  kind: "beer-update";
  beerId: number;
  rating: number | null;
  comment: string | null;
  imageRemote: string | null;
}

export type ModerationPayload = ModerationNewBeerPayload | ModerationBeerUpdatePayload;

export interface ModerationSubmission {
  id: string;
  status: ModerationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
  user: Pick<UserSession, "id" | "first_name" | "username">;
  payload: ModerationPayload;
}

function ensureAdminDir() {
  if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR, { recursive: true });
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function countFilesRecursive(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;

  let total = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      total += 1;
    } else if (entry.isDirectory()) {
      total += countFilesRecursive(full);
    }
  }

  return total;
}

function readBeers(): Beer[] {
  return safeReadJson<Beer[]>(BEERS_JSON_PATH, []);
}

function writeBeers(beers: Beer[]) {
  fs.writeFileSync(BEERS_JSON_PATH, JSON.stringify(beers, null, 2));
}

function generateId(prefix = "mod") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function toOneDecimal(n: number) {
  return Math.round(n * 10) / 10;
}

export function isBeerNameExists(name: string) {
  const n = normalizeName(name);
  if (!n) return false;
  const beers = readBeers();
  return beers.some((beer) => normalizeName(beer.name) === n);
}

export function beerExistsById(beerId: number) {
  const beers = readBeers();
  return beers.some((beer) => beer.id === beerId);
}

export function addSyncHistory(entry: SyncHistoryEntry) {
  ensureAdminDir();
  const history = safeReadJson<SyncHistoryEntry[]>(SYNC_HISTORY_PATH, []);
  history.unshift(entry);
  const trimmed = history.slice(0, 200);
  fs.writeFileSync(SYNC_HISTORY_PATH, JSON.stringify(trimmed, null, 2));
}

export function readSyncHistory(limit = 20): SyncHistoryEntry[] {
  const history = safeReadJson<SyncHistoryEntry[]>(SYNC_HISTORY_PATH, []);
  return history.slice(0, Math.max(0, limit));
}

export function addAuditEntry(action: string, details?: Record<string, unknown>) {
  ensureAdminDir();
  const entry: AuditEntry = {
    at: new Date().toISOString(),
    action,
    details,
  };
  fs.appendFileSync(AUDIT_LOG_PATH, `${JSON.stringify(entry)}\n`);
}

export function readAuditEntries(limit = 20): AuditEntry[] {
  if (!fs.existsSync(AUDIT_LOG_PATH)) return [];

  const lines = fs.readFileSync(AUDIT_LOG_PATH, "utf8").split("\n").filter(Boolean);
  const result: AuditEntry[] = [];

  for (let i = lines.length - 1; i >= 0 && result.length < limit; i -= 1) {
    try {
      result.push(JSON.parse(lines[i]) as AuditEntry);
    } catch {
      // ignore malformed line
    }
  }

  return result;
}

function readModerationQueue() {
  return safeReadJson<ModerationSubmission[]>(MODERATION_QUEUE_PATH, []);
}

function writeModerationQueue(items: ModerationSubmission[]) {
  ensureAdminDir();
  fs.writeFileSync(MODERATION_QUEUE_PATH, JSON.stringify(items, null, 2));
}

export function readModerationSubmissions(limit = 50) {
  const items = readModerationQueue();
  return items.slice(0, Math.max(0, limit));
}

export function addModerationSubmission(input: {
  user: Pick<UserSession, "id" | "first_name" | "username">;
  payload: ModerationPayload;
}) {
  const items = readModerationQueue();
  const submission: ModerationSubmission = {
    id: generateId("sub"),
    status: "pending",
    createdAt: new Date().toISOString(),
    user: {
      id: input.user.id,
      first_name: input.user.first_name,
      username: input.user.username,
    },
    payload: input.payload,
  };

  items.unshift(submission);
  writeModerationQueue(items.slice(0, 500));
  return submission;
}

function applyNewBeer(payload: ModerationNewBeerPayload) {
  if (isBeerNameExists(payload.name)) {
    throw new Error("Пиво с таким названием уже есть в базе");
  }

  const beers = readBeers();
  const maxId = beers.reduce((max, beer) => Math.max(max, beer.id || 0), 0);
  const nextId = maxId + 1;

  const item: Beer = {
    id: nextId,
    name: payload.name,
    image: null,
    imageRemote: payload.imageRemote,
    images: payload.imageRemote ? [{ local: null, remote: payload.imageRemote }] : [],
    type: payload.type,
    sort: payload.sort,
    filtration: payload.filtration,
    country: payload.country,
    price: payload.price,
    traits: payload.traits,
    rating: payload.rating,
    comment: payload.comment,
  };

  beers.push(item);
  writeBeers(beers);

  return { beerId: nextId, beerName: payload.name };
}

function applyBeerUpdate(payload: ModerationBeerUpdatePayload, user: ModerationSubmission["user"]) {
  const beers = readBeers();
  const idx = beers.findIndex((beer) => beer.id === payload.beerId);
  if (idx === -1) {
    throw new Error("Карточка пива не найдена");
  }

  const beer = beers[idx];

  if (typeof payload.rating === "number") {
    const r = toOneDecimal(payload.rating);
    if (beer.rating == null) {
      beer.rating = r;
    } else {
      beer.rating = toOneDecimal((beer.rating + r) / 2);
    }
  }

  if (payload.comment) {
    const author = user.username ? `${user.first_name} (@${user.username})` : user.first_name;
    const stamp = new Date().toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
    const block = `${payload.comment}\n— ${author}, ${stamp}`;
    beer.comment = beer.comment ? `${beer.comment}\n\n${block}` : block;
  }

  if (payload.imageRemote) {
    const images = Array.isArray(beer.images) ? [...beer.images] : [];
    const exists = images.some((img) => img.remote === payload.imageRemote || img.local === payload.imageRemote);
    if (!exists) images.push({ local: null, remote: payload.imageRemote });
    beer.images = images;
    if (!beer.imageRemote) beer.imageRemote = payload.imageRemote;
  }

  beers[idx] = beer;
  writeBeers(beers);

  return { beerId: beer.id, beerName: beer.name };
}

function applyModerationApproval(submission: ModerationSubmission) {
  if (submission.payload.kind === "new-beer") {
    return applyNewBeer(submission.payload);
  }
  return applyBeerUpdate(submission.payload, submission.user);
}

export function reviewModerationSubmission(input: {
  submissionId: string;
  action: "approve" | "reject";
  reviewer?: string;
  note?: string;
}) {
  const items = readModerationQueue();
  const idx = items.findIndex((entry) => entry.id === input.submissionId);
  if (idx === -1) throw new Error("Заявка не найдена");

  const current = items[idx];
  if (current.status !== "pending") {
    throw new Error("Заявка уже обработана");
  }

  let applied: { beerId: number; beerName: string } | null = null;
  if (input.action === "approve") {
    applied = applyModerationApproval(current);
  }

  const updated: ModerationSubmission = {
    ...current,
    status: input.action === "approve" ? "approved" : "rejected",
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewer || "admin",
    note: input.note?.trim() || undefined,
  };

  items[idx] = updated;
  writeModerationQueue(items);

  addAuditEntry("moderation_reviewed", {
    submissionId: updated.id,
    action: input.action,
    kind: updated.payload.kind,
    reviewedBy: updated.reviewedBy,
    note: updated.note || null,
    appliedBeerId: applied?.beerId || null,
  });

  return { submission: updated, applied };
}

export function getBeeradmOverview() {
  const beers = safeReadJson<unknown[]>(BEERS_JSON_PATH, []);
  const syncHistory = readSyncHistory(20);
  const audit = readAuditEntries(20);
  const moderation = readModerationSubmissions(100);
  const moderationPending = moderation.filter((entry) => entry.status === "pending");

  return {
    beersCount: Array.isArray(beers) ? beers.length : 0,
    imagesCount: countFilesRecursive(IMAGES_DIR),
    thumbsCount: countFilesRecursive(THUMBS_DIR),
    syncHistory,
    audit,
    lastSync: syncHistory[0] ?? null,
    moderationPending,
    moderationPendingCount: moderationPending.length,
    moderationRecent: moderation.slice(0, 30),
  };
}
