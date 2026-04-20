import fs from "fs";
import path from "path";
import type { Beer, BeerImage } from "@/lib/types";
import type { UserSession } from "@/lib/user-auth";
import { USER_LEVELS, type UserLevelInfo, type UserView } from "@/lib/user-view";
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
  customAvatarLocal?: string | null;
  heroImageLocal?: string | null;
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

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function roundUpToOneDecimal(value: number) {
  return Math.ceil(value * 10 - 1e-9) / 10;
}

function normalizeRating(value: number) {
  return roundToOneDecimal(Math.max(1, Math.min(10, value)));
}

function hasAnyInteraction(entry: UserBeerEntry) {
  return entry.addedByUser || entry.rating != null || Boolean(entry.comment) || entry.images.length > 0;
}

function findProfile(store: UserBaseStore, userId: number) {
  return store.users.find((item) => item.userId === userId) || null;
}

function upsertProfile(
  store: UserBaseStore,
  user: Pick<UserSession, "id" | "first_name" | "last_name" | "username">
) {
  let profile = findProfile(store, user.id);

  if (!profile) {
    profile = {
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      customAvatarLocal: null,
      heroImageLocal: null,
      beers: [],
    };
    store.users.push(profile);
  } else {
    profile.firstName = user.first_name;
    profile.lastName = user.last_name;
    profile.username = user.username;
    profile.customAvatarLocal ??= null;
    profile.heroImageLocal ??= null;
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

export function getUserBaseProfile(userId: number) {
  const store = safeReadStore();
  return findProfile(store, userId);
}

export function getUserInteractionCount(profile: UserBaseProfile | null | undefined) {
  if (!profile) return 0;
  return profile.beers.filter(hasAnyInteraction).length;
}

export function getUserLevelInfo(interactionCount: number): UserLevelInfo {
  if (interactionCount <= 10) return USER_LEVELS[0];
  if (interactionCount <= 100) return USER_LEVELS[1];
  if (interactionCount <= 500) return USER_LEVELS[2];
  if (interactionCount <= 1000) return USER_LEVELS[3];
  return USER_LEVELS[4];
}

export function getUserView(user: UserSession | null): UserView | null {
  if (!user) return null;

  const profile = getUserBaseProfile(user.id);
  const interactionCount = getUserInteractionCount(profile);
  const level = getUserLevelInfo(interactionCount);

  return {
    ...user,
    avatarUrl: profile?.customAvatarLocal || user.photo_url || null,
    customAvatarUrl: profile?.customAvatarLocal || null,
    heroImageUrl: profile?.heroImageLocal || null,
    interactionCount,
    ratingLevel: level.level,
    ratingWeight: level.weight,
    ratingBadgeLabel: level.badgeLabel,
    ratingLevelTitle: level.title,
  };
}

export function updateUserProfileMedia(input: {
  user: Pick<UserSession, "id" | "first_name" | "last_name" | "username">;
  customAvatarLocal?: string | null;
  heroImageLocal?: string | null;
}) {
  const store = safeReadStore();
  const profile = upsertProfile(store, input.user);

  if (input.customAvatarLocal !== undefined) {
    profile.customAvatarLocal = input.customAvatarLocal;
  }

  if (input.heroImageLocal !== undefined) {
    profile.heroImageLocal = input.heroImageLocal;
  }

  writeStore(store);
  return profile;
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
  const profile = getUserBaseProfile(userId);
  if (!profile) return null;
  return profile.beers.find((item) => item.beerId === beerId) || null;
}

type WeightedUserRating = {
  rating: number;
  weight: number;
};

function buildWeightedRatingsIndex(store: UserBaseStore) {
  const index = new Map<number, WeightedUserRating[]>();

  for (const profile of store.users) {
    const weight = getUserLevelInfo(getUserInteractionCount(profile)).weight;

    for (const entry of profile.beers) {
      if (typeof entry.rating !== "number") continue;
      const list = index.get(entry.beerId) ?? [];
      list.push({ rating: entry.rating, weight });
      index.set(entry.beerId, list);
    }
  }

  return index;
}

function computeWeightedRating(
  baseRating: number | null,
  userRatings: WeightedUserRating[]
) {
  const baseWeight = typeof baseRating === "number" ? 10 : 0;
  const totalWeight = baseWeight + userRatings.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return null;

  const totalScore = (typeof baseRating === "number" ? baseRating * 10 : 0)
    + userRatings.reduce((sum, item) => sum + item.rating * item.weight, 0);

  return roundUpToOneDecimal(totalScore / totalWeight);
}

export function computeDisplayedBeerRating(beer: Beer) {
  const store = safeReadStore();
  const ratings = buildWeightedRatingsIndex(store).get(beer.id) ?? [];
  return computeWeightedRating(beer.rating, ratings);
}

export function hydrateBeersWithComputedRatings(beers: Beer[]) {
  const store = safeReadStore();
  const ratingsIndex = buildWeightedRatingsIndex(store);

  return beers.map((beer) => {
    const computed = computeWeightedRating(beer.rating, ratingsIndex.get(beer.id) ?? []);
    if (computed == null) return beer;
    return {
      ...beer,
      rating: computed,
    };
  });
}

export function getUserBaseBeers(userId: number): Beer[] {
  const store = safeReadStore();
  const profile = findProfile(store, userId);
  if (!profile) return [];

  const beers = readBeersData();
  const ratingsIndex = buildWeightedRatingsIndex(store);
  const result: Beer[] = [];

  for (const entry of [...profile.beers].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))) {
    const beer = beers.find((item) => item.id === entry.beerId);
    if (!beer || !canAccessBeer(beer, { userId })) continue;

    const computedRating = computeWeightedRating(beer.rating, ratingsIndex.get(beer.id) ?? []);
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
