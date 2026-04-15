import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");
const BEERS_JSON_PATH = path.join(DATA_DIR, "beers.json");
const SYNC_HISTORY_PATH = path.join(ADMIN_DIR, "sync-history.json");
const AUDIT_LOG_PATH = path.join(ADMIN_DIR, "audit.log");

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

export function getBeeradmOverview() {
  const beers = safeReadJson<unknown[]>(BEERS_JSON_PATH, []);
  const syncHistory = readSyncHistory(20);
  const audit = readAuditEntries(20);

  return {
    beersCount: Array.isArray(beers) ? beers.length : 0,
    imagesCount: countFilesRecursive(IMAGES_DIR),
    thumbsCount: countFilesRecursive(THUMBS_DIR),
    syncHistory,
    audit,
    lastSync: syncHistory[0] ?? null,
  };
}

