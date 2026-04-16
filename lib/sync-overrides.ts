import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const OVERRIDES_PATH = path.join(ADMIN_DIR, "sync-overrides.json");
const MAX_TOMBSTONES = 5000;

export interface DeletedBeerTombstone {
  id: number | null;
  name: string | null;
  normalizedName: string | null;
  deletedAt: string;
  reason?: string;
}

interface SyncOverridesPayload {
  deletedBeers: DeletedBeerTombstone[];
}

function ensureAdminDir() {
  if (!fs.existsSync(ADMIN_DIR)) {
    fs.mkdirSync(ADMIN_DIR, { recursive: true });
  }
}

export function normalizeBeerName(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function readSyncOverrides(): SyncOverridesPayload {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return { deletedBeers: [] };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, "utf8")) as Partial<SyncOverridesPayload>;
    const deleted = Array.isArray(raw.deletedBeers) ? raw.deletedBeers : [];
    return { deletedBeers: deleted };
  } catch {
    return { deletedBeers: [] };
  }
}

function writeSyncOverrides(payload: SyncOverridesPayload) {
  ensureAdminDir();
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(payload, null, 2));
}

export function markBeerDeletedTombstone(input: { id: number; name: string; reason?: string }) {
  const current = readSyncOverrides();
  const normalizedName = normalizeBeerName(input.name) || null;

  const filtered = current.deletedBeers.filter((item) => {
    if (item.id != null && item.id === input.id) return false;
    if (normalizedName && item.normalizedName === normalizedName) return false;
    return true;
  });

  const next: DeletedBeerTombstone = {
    id: Number.isFinite(input.id) ? input.id : null,
    name: input.name || null,
    normalizedName,
    deletedAt: new Date().toISOString(),
    reason: input.reason,
  };

  const merged = [next, ...filtered].slice(0, MAX_TOMBSTONES);
  writeSyncOverrides({ deletedBeers: merged });

  return next;
}

export function isBeerSuppressedByTombstone(
  beer: { id: number; name: string },
  tombstones?: DeletedBeerTombstone[]
) {
  const list = tombstones ?? readSyncOverrides().deletedBeers;
  const name = normalizeBeerName(beer.name);

  return list.some((item) => {
    if (item.id != null && item.id === beer.id) return true;
    if (name && item.normalizedName && item.normalizedName === name) return true;
    return false;
  });
}
