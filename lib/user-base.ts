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

type PersistedUserInput = Pick<UserSession, "id" | "first_name"> & Partial<Pick<UserSession, "last_name" | "username" | "photo_url">>;

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
  photoUrl?: string | null;
  customAvatarLocal?: string | null;
  heroImageLocal?: string | null;
  beers: UserBeerEntry[];
}

interface UserBaseStore {
  users: UserBaseProfile[];
}

export interface AdminUserBeerSummary {
  beerId: number;
  beerName: string;
  rating: number | null;
  updatedAt: string;
  addedByUser: boolean;
}

export interface AdminUserCommentSummary {
  beerId: number;
  beerName: string;
  comment: string;
  updatedAt: string;
}

export interface AdminUserSummary {
  userId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  avatarUrl: string | null;
  heroImageUrl: string | null;
  interactionCount: number;
  beersCount: number;
  commentsCount: number;
  ratingLevel: number;
  ratingWeight: number;
  ratingBadgeLabel: string;
  beers: AdminUserBeerSummary[];
  comments: AdminUserCommentSummary[];
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

function normalizeLocalImage(local: string | null | undefined) {
  return local?.split("?")[0] || null;
}

function hasAnyInteraction(entry: UserBeerEntry) {
  return entry.addedByUser || entry.rating != null || Boolean(entry.comment) || entry.images.length > 0;
}

function findProfile(store: UserBaseStore, userId: number) {
  return store.users.find((item) => item.userId === userId) || null;
}

function getProfileAvatarUrl(profile: UserBaseProfile | null | undefined, fallbackPhotoUrl?: string | null) {
  return profile?.customAvatarLocal || profile?.photoUrl || fallbackPhotoUrl || null;
}

function upsertProfile(store: UserBaseStore, user: PersistedUserInput) {
  let profile = findProfile(store, user.id);

  if (!profile) {
    profile = {
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      photoUrl: user.photo_url || null,
      customAvatarLocal: null,
      heroImageLocal: null,
      beers: [],
    };
    store.users.push(profile);
  } else {
    profile.firstName = user.first_name;
    profile.lastName = user.last_name;
    profile.username = user.username;
    if (user.photo_url) {
      profile.photoUrl = user.photo_url;
    } else {
      profile.photoUrl ??= null;
    }
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

function collectBeerLocalImages(beer: Beer) {
  const set = new Set<string>();

  const main = normalizeLocalImage(beer.image);
  if (main) set.add(main);

  if (Array.isArray(beer.images)) {
    for (const img of beer.images) {
      const local = normalizeLocalImage(img.local);
      if (local) set.add(local);
    }
  }

  return Array.from(set);
}

export function ensureUserProfile(user: PersistedUserInput) {
  const store = safeReadStore();
  const profile = upsertProfile(store, user);
  writeStore(store);
  return profile;
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
    avatarUrl: getProfileAvatarUrl(profile, user.photo_url),
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
  user: PersistedUserInput;
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
  user: PersistedUserInput;
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

export function canUserRotateLocalImage(userId: number, localUrl: string) {
  const normalized = normalizeLocalImage(localUrl);
  if (!normalized) return false;

  const profile = getUserBaseProfile(userId);
  if (!profile) return false;

  for (const entry of profile.beers) {
    if (entry.images.some((image) => normalizeLocalImage(image.local) === normalized)) {
      return true;
    }
  }

  const beers = readBeersData();
  return beers.some((beer) => {
    if (beer.visibility !== "user-only" || beer.ownerUserId !== userId) return false;
    return collectBeerLocalImages(beer).includes(normalized);
  });
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

function computeWeightedRating(baseRating: number | null, userRatings: WeightedUserRating[]) {
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

export function listUsersForAdmin(): AdminUserSummary[] {
  const store = safeReadStore();
  const beers = readBeersData();

  return [...store.users]
    .map((profile) => {
      const interactionCount = getUserInteractionCount(profile);
      const level = getUserLevelInfo(interactionCount);
      const userBeers = [...profile.beers]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map((entry) => {
          const beer = beers.find((item) => item.id === entry.beerId);
          return {
            beerId: entry.beerId,
            beerName: beer?.name || `#${entry.beerId}`,
            rating: entry.rating,
            updatedAt: entry.updatedAt,
            addedByUser: entry.addedByUser,
          } satisfies AdminUserBeerSummary;
        });

      const comments = profile.beers
        .filter((entry) => Boolean(entry.comment))
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .map((entry) => {
          const beer = beers.find((item) => item.id === entry.beerId);
          return {
            beerId: entry.beerId,
            beerName: beer?.name || `#${entry.beerId}`,
            comment: entry.comment || "",
            updatedAt: entry.updatedAt,
          } satisfies AdminUserCommentSummary;
        });

      return {
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        avatarUrl: getProfileAvatarUrl(profile),
        heroImageUrl: profile.heroImageLocal || null,
        interactionCount,
        beersCount: profile.beers.length,
        commentsCount: comments.length,
        ratingLevel: level.level,
        ratingWeight: level.weight,
        ratingBadgeLabel: level.badgeLabel,
        beers: userBeers,
        comments,
      } satisfies AdminUserSummary;
    })
    .sort((a, b) => {
      const diff = b.interactionCount - a.interactionCount;
      if (diff !== 0) return diff;
      return a.firstName.localeCompare(b.firstName, "ru");
    });
}

export function createPersonalBeer(input: {
  user: PersistedUserInput;
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
