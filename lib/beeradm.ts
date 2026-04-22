import fs from "fs";
import path from "path";
import type { Beer, BeerImage } from "@/lib/types";
import type { UserSession } from "@/lib/user-auth";
import {
  getBeerById,
  getNextBeerId,
  isBeerNameTaken,
  type NovelTaxonomyValue,
  readBeersData,
  writeBeersData,
} from "@/lib/beers-store";
import { listUsersForAdmin } from "@/lib/user-base";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
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
  beerId?: number;
  name: string;
  country: string | null;
  type: string | null;
  sort: string | null;
  filtration: string | null;
  price: number | null;
  rating: number | null;
  comment: string | null;
  imageLocal: string | null;
  imageRemote: string | null;
  novelFields?: NovelTaxonomyValue[];
  traits: Beer["traits"];
}

export interface ModerationBeerReviewPayload {
  kind: "beer-review";
  beerId: number;
  comment: string | null;
  imageLocal: string | null;
  imageRemote: string | null;
}

export type ModerationPayload = ModerationNewBeerPayload | ModerationBeerReviewPayload;

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

function readBeers() {
  return readBeersData();
}

function writeBeers(beers: Beer[]) {
  writeBeersData(beers);
}

function generateId(prefix = "mod") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function toOneDecimal(n: number) {
  return Math.round(n * 10) / 10;
}

function uniqueImages(images: BeerImage[]) {
  const result: BeerImage[] = [];
  for (const image of images) {
    const exists = result.some((item) => item.local === image.local && item.remote === image.remote);
    if (!exists) result.push(image);
  }
  return result;
}

export function isBeerNameExists(name: string) {
  return isBeerNameTaken(name, { includePrivateFromOthers: true });
}

export function beerExistsById(beerId: number) {
  return Boolean(getBeerById(beerId));
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
  const beers = readBeers();

  if (typeof payload.beerId === "number") {
    const idx = beers.findIndex((beer) => beer.id === payload.beerId);
    if (idx !== -1) {
      const current = beers[idx];

      if (isBeerNameTaken(payload.name, { userId: current.ownerUserId, excludeBeerId: current.id })) {
        throw new Error("Пиво с таким названием уже есть в базе");
      }

      const mergedImages = uniqueImages([
        ...(Array.isArray(current.images) ? current.images : []),
        ...(payload.imageLocal || payload.imageRemote
          ? [{ local: payload.imageLocal, remote: payload.imageRemote }]
          : []),
      ]);

      const updated: Beer = {
        ...current,
        name: payload.name,
        country: payload.country,
        type: payload.type,
        sort: payload.sort,
        filtration: payload.filtration,
        price: payload.price,
        traits: payload.traits,
        comment: payload.comment ?? current.comment,
        image: payload.imageLocal ?? current.image,
        imageRemote: payload.imageRemote ?? current.imageRemote,
        images: mergedImages,
        visibility: "public",
        ownerUserId: null,
        createdByUserId: current.createdByUserId ?? current.ownerUserId ?? null,
      };

      beers[idx] = updated;
      writeBeers(beers);

      return { beerId: updated.id, beerName: updated.name };
    }
  }

  if (isBeerNameTaken(payload.name, { includePrivateFromOthers: true })) {
    throw new Error("Пиво с таким названием уже есть в базе");
  }

  const nextId = getNextBeerId(beers);
  const item: Beer = {
    id: nextId,
    name: payload.name,
    image: payload.imageLocal,
    imageRemote: payload.imageRemote,
    images: payload.imageLocal || payload.imageRemote
      ? [{ local: payload.imageLocal, remote: payload.imageRemote }]
      : [],
    type: payload.type,
    sort: payload.sort,
    filtration: payload.filtration,
    country: payload.country,
    price: payload.price,
    traits: payload.traits,
    rating: payload.rating,
    comment: payload.comment,
    visibility: "public",
    ownerUserId: null,
  };

  beers.push(item);
  writeBeers(beers);

  return { beerId: nextId, beerName: payload.name };
}

function applyBeerReview(payload: ModerationBeerReviewPayload, user: ModerationSubmission["user"]) {
  const beers = readBeers();
  const idx = beers.findIndex((beer) => beer.id === payload.beerId);
  if (idx === -1) {
    throw new Error("Карточка пива не найдена");
  }

  const beer = beers[idx];

  if (payload.comment) {
    const author = user.username ? `${user.first_name} (@${user.username})` : user.first_name;
    const stamp = new Date().toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
    const block = `${payload.comment}\n— ${author}, ${stamp}`;
    beer.comment = beer.comment ? `${beer.comment}\n\n${block}` : block;
  }

  if (payload.imageRemote || payload.imageLocal) {
    const images = Array.isArray(beer.images) ? [...beer.images] : [];
    const candidate = {
      local: payload.imageLocal,
      remote: payload.imageRemote,
    };

    const exists = images.some((img) => img.local === candidate.local && img.remote === candidate.remote);
    if (!exists) {
      images.push(candidate);
    }

    beer.images = images;
    if (payload.imageLocal && !beer.image) beer.image = payload.imageLocal;
    if (payload.imageRemote && !beer.imageRemote) beer.imageRemote = payload.imageRemote;
  }

  beers[idx] = beer;
  writeBeers(beers);

  return { beerId: beer.id, beerName: beer.name };
}

function applyModerationApproval(submission: ModerationSubmission) {
  if (submission.payload.kind === "new-beer") {
    return applyNewBeer(submission.payload);
  }
  return applyBeerReview(submission.payload, submission.user);
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
  const beers = readBeers();
  const syncHistory = readSyncHistory(20);
  const audit = readAuditEntries(20);
  const moderation = readModerationSubmissions(100);
  const moderationPending = moderation.filter((entry) => entry.status === "pending");
  const moderationPendingReviews = moderationPending.filter((entry) => entry.payload.kind === "beer-review");
  const moderationPendingCards = moderationPending.filter((entry) => entry.payload.kind === "new-beer");

  return {
    beersCount: beers.length,
    imagesCount: countFilesRecursive(IMAGES_DIR),
    thumbsCount: countFilesRecursive(THUMBS_DIR),
    syncHistory,
    audit,
    lastSync: syncHistory[0] ?? null,
    moderationPending,
    moderationPendingCount: moderationPending.length,
    moderationPendingReviews,
    moderationPendingCards,
    moderationRecent: moderation.slice(0, 30),
    users: listUsersForAdmin(),
  };
}
