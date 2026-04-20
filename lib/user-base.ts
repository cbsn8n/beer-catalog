import fs from "fs";
import path from "path";
import type { Beer, BeerImage } from "@/lib/types";
import type { UserSession } from "@/lib/user-auth";
import {
  canAccessBeer,
  getNextBeerId,
  isBeerNameTaken,
  readBeersData,
  writeBeersData,
} from "@/lib/beers-store";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ADMIN_DIR = path.join(DATA_DIR, "admin");
const USER_BASES_PATH = path.join(ADMIN_DIR, "user-bases.json");

export interface UserBeerEntry {
  beerId: number;
  rating: number | null;
  comment: string | null;
  images: BeerImage[];
  addedByUser: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserBaseProfile {
  userId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  beers: UserBeerEntry[];
}

interface UserBaseStore {
  users: UserBaseProfile[];
}

function ensureAdminDir() {
  if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR, { recursive: true });
}

function safeReadStore(): UserBaseStore {
  if (!fs.existsSync(USER_BASES_PATH)) return { users: [] };

  try {
    return JSON.parse(fs.readFileSync(USER_BASES_PATH, "utf8")) as UserBaseStore;
  } catch {
    return { users: [] };
  }
}

function writeStore(store: UserBaseStore) {
  ensureAdminDir();
  fs.writeFileSync(USER_BASES_PATH, JSON.stringify(store, null, 2));
}

function toOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeRating(value: number) {
  return toOneDecimal(Math.max(1, Math.min(10, value)));
}

function upsertProfile(store: UserBaseStore, user: Pick<UserSession, "id" | "first_name" | "last_name" | "username">) {
  let profile = store.users.find((item) => item.userId === user.id);

  if (!profile) {
    profile = {
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      beers: [],
    };
    store.users.push(profile);
  } else {
    profile.firstName = user.first_name;
    profile.lastName = user.last_name;
    profile.username = user.username;
  }

  return profile;
}

function upsertBeerEntry(profile: UserBaseProfile, beerId: number) {
  const now = new Date().toISOString();
  let entry = profile.beers.find((item) => item.beerId === beerId);

  if (!entry) {
    entry = {
      beerId,
      rating: null,
      comment: null,
      images: [],
      addedByUser: false,
      createdAt: now,
      updatedAt: now,
    };
    profile.beers.push(entry);
  }

  entry.updatedAt = now;
  return entry;
}

function hasImage(images: BeerImage[], candidate: BeerImage) {
  return images.some((image) => image.local === candidate.local && image.remote === candidate.remote);
}

export function upsertUserBeerEntry(input: {
  user: Pick<UserSession, "id" | "first_name" | "last_name" | "username">;
  beerId: number;
  rating?: number;
  comment?: string | null;
  imageLocal?: string | null;
  imageRemote?: string | null;
  addedByUser?: boolean;
}) {
  const store = safeReadStore();
  const profile = upsertProfile(store, input.user);
  const entry = upsertBeerEntry(profile, input.beerId);

  if (typeof input.rating === "number") {
    entry.rating = normalizeRating(input.rating);
  }

  if (typeof input.comment === "string") {
    entry.comment = input.comment.trim() || null;
  }

  if (input.addedByUser) {
    entry.addedByUser = true;
  }

  if (input.imageLocal || input.imageRemote) {
    const candidate: BeerImage = {
      local: input.imageLocal ?? null,
      remote: input.imageRemote ?? null,
    };

    if (!hasImage(entry.images, candidate)) {
      entry.images.unshift(candidate);
    }
  }

  writeStore(store);
  return entry;
}

export function getUserBeerEntry(userId: number, beerId: number) {
  const store = safeReadStore();
  const profile = store.users.find((item) => item.userId === userId);
  if (!profile) return null;
  return profile.beers.find((item) => item.beerId === beerId) || null;
}

export function getUserBaseProfile(userId: number) {
  const store = safeReadStore();
  return store.users.find((item) => item.userId === userId) || null;
}

function buildRatingsIndex(store: UserBaseStore) {
  const index = new Map<number, number[]>();

  for (const user of store.users) {
    for (const entry of user.beers) {
      if (typeof entry.rating !== "number") continue;
      const list = index.get(entry.beerId) ?? [];
      list.push(entry.rating);
      index.set(entry.beerId, list);
    }
  }

  return index;
}

export function computeDisplayedBeerRating(beer: Beer) {
  const store = safeReadStore();
  const ratings = buildRatingsIndex(store).get(beer.id) ?? [];

  if (ratings.length === 0) {
    return beer.rating ?? null;
  }

  const values = [...ratings];
  if (typeof beer.rating === "number") {
    values.unshift(beer.rating);
  }

  if (values.length === 0) return null;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return toOneDecimal(avg);
}

export function hydrateBeersWithComputedRatings(beers: Beer[]) {
  const store = safeReadStore();
  const ratingsIndex = buildRatingsIndex(store);

  return beers.map((beer) => {
    const ratings = ratingsIndex.get(beer.id) ?? [];
    if (ratings.length === 0) return beer;

    const values = [...ratings];
    if (typeof beer.rating === "number") {
      values.unshift(beer.rating);
    }

    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return {
      ...beer,
      rating: toOneDecimal(avg),
    };
  });
}

export function getUserBaseBeers(userId: number): Beer[] {
  const store = safeReadStore();
  const profile = store.users.find((item) => item.userId === userId);
  if (!profile) return [];

  const beers = readBeersData();
  const ratingsIndex = buildRatingsIndex(store);
  const result: Beer[] = [];

  for (const entry of [...profile.beers].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    const beer = beers.find((item) => item.id === entry.beerId);
    if (!beer || !canAccessBeer(beer, { userId })) continue;

    const values = ratingsIndex.get(beer.id) ?? [];
    const computedRating = values.length > 0
      ? toOneDecimal(
          values.reduce((sum, value) => sum + value, typeof beer.rating === "number" ? beer.rating : 0)
            / (values.length + (typeof beer.rating === "number" ? 1 : 0))
        )
      : (beer.rating ?? null);

    const firstPersonalImage = entry.images[0] || null;

    result.push({
      ...beer,
      rating: entry.rating ?? computedRating,
      comment: entry.comment ?? beer.comment,
      image: beer.image || firstPersonalImage?.local || null,
      imageRemote: beer.imageRemote || firstPersonalImage?.remote || null,
      userRating: entry.rating,
      userComment: entry.comment,
      userImages: entry.images,
      userUpdatedAt: entry.updatedAt,
      userAddedByUser: entry.addedByUser,
    });
  }

  return result;
}

export function createPersonalBeer(input: {
  user: Pick<UserSession, "id" | "first_name" | "last_name" | "username">;
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
  traits: Beer["traits"];
}) {
  if (isBeerNameTaken(input.name, { userId: input.user.id })) {
    throw new Error("Пиво с таким названием уже есть в базе");
  }

  const beers = readBeersData();
  const nextId = getNextBeerId(beers);

  const item: Beer = {
    id: nextId,
    name: input.name,
    image: input.imageLocal,
    imageRemote: input.imageRemote,
    images: input.imageLocal || input.imageRemote
      ? [{ local: input.imageLocal, remote: input.imageRemote }]
      : [],
    type: input.type,
    sort: input.sort,
    filtration: input.filtration,
    country: input.country,
    price: input.price,
    traits: input.traits,
    rating: null,
    comment: input.comment,
    visibility: "user-only",
    ownerUserId: input.user.id,
    createdByUserId: input.user.id,
  };

  beers.push(item);
  writeBeersData(beers);

  upsertUserBeerEntry({
    user: input.user,
    beerId: item.id,
    rating: typeof input.rating === "number" ? input.rating : undefined,
    comment: input.comment,
    imageLocal: input.imageLocal,
    imageRemote: input.imageRemote,
    addedByUser: true,
  });

  return item;
}
