import fs from "fs";
import path from "path";
import type { Beer } from "@/lib/types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const BEERS_JSON_PATH = path.join(DATA_DIR, "beers.json");

export const TAXONOMY_FIELDS = ["country", "type", "sort", "filtration"] as const;

export type TaxonomyField = (typeof TAXONOMY_FIELDS)[number];

export interface NovelTaxonomyValue {
  field: TaxonomyField;
  value: string;
}

export function readBeersData(): Beer[] {
  if (!fs.existsSync(BEERS_JSON_PATH)) return [];

  try {
    return JSON.parse(fs.readFileSync(BEERS_JSON_PATH, "utf8")) as Beer[];
  } catch {
    return [];
  }
}

export function writeBeersData(beers: Beer[]) {
  fs.mkdirSync(path.dirname(BEERS_JSON_PATH), { recursive: true });
  fs.writeFileSync(BEERS_JSON_PATH, JSON.stringify(beers, null, 2));
}

export function getNextBeerId(beers: Beer[] = readBeersData()) {
  return beers.reduce((max, beer) => Math.max(max, beer.id || 0), 0) + 1;
}

export function normalizeBeerName(value: string) {
  return value.trim().toLowerCase();
}

export function isPrivateBeer(beer: Beer) {
  return beer.visibility === "user-only";
}

export function canAccessBeer(
  beer: Beer,
  options?: { userId?: number | null; isAdmin?: boolean }
) {
  if (!isPrivateBeer(beer)) return true;
  if (options?.isAdmin) return true;
  return options?.userId != null && beer.ownerUserId === options.userId;
}

export function listPublicBeers(beers: Beer[] = readBeersData()) {
  return beers.filter((beer) => !isPrivateBeer(beer));
}

export function getBeerById(id: number, beers: Beer[] = readBeersData()) {
  return beers.find((beer) => beer.id === id) || null;
}

export function isBeerNameTaken(
  name: string,
  options?: { userId?: number | null; includePrivateFromOthers?: boolean; excludeBeerId?: number | null }
) {
  const normalized = normalizeBeerName(name);
  if (!normalized) return false;

  return readBeersData().some((beer) => {
    if (options?.excludeBeerId != null && beer.id === options.excludeBeerId) return false;
    if (normalizeBeerName(beer.name) !== normalized) return false;
    if (!isPrivateBeer(beer)) return true;
    if (options?.includePrivateFromOthers) return true;
    return options?.userId != null && beer.ownerUserId === options.userId;
  });
}

function collectFieldValues(beers: Beer[], field: TaxonomyField) {
  return new Set(
    beers
      .map((beer) => beer[field])
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim().toLowerCase())
  );
}

export function detectNovelTaxonomyValues(input: Partial<Record<TaxonomyField, string | null | undefined>>) {
  const publicBeers = listPublicBeers(readBeersData());
  const known = {
    country: collectFieldValues(publicBeers, "country"),
    type: collectFieldValues(publicBeers, "type"),
    sort: collectFieldValues(publicBeers, "sort"),
    filtration: collectFieldValues(publicBeers, "filtration"),
  };

  const result: NovelTaxonomyValue[] = [];

  for (const field of TAXONOMY_FIELDS) {
    const rawValue = input[field];
    if (typeof rawValue !== "string") continue;
    const value = rawValue.trim();
    if (!value) continue;
    if (!known[field].has(value.toLowerCase())) {
      result.push({ field, value });
    }
  }

  return result;
}
