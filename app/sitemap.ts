import fs from "fs";
import path from "path";
import type { MetadataRoute } from "next";

type BeerRow = {
  id: number;
};

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const JSON_PATH = path.join(DATA_DIR, "beers.json");

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && /^https?:\/\//.test(envUrl)) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://vana.beer";
}

function readBeerIds() {
  if (!fs.existsSync(JSON_PATH)) return [] as number[];
  try {
    const beers = JSON.parse(fs.readFileSync(JSON_PATH, "utf8")) as BeerRow[];
    return beers
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id));
  } catch {
    return [] as number[];
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/legal`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/beer/add`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/beeradm`, lastModified: now, changeFrequency: "weekly", priority: 0.2 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];

  const beerRoutes: MetadataRoute.Sitemap = readBeerIds().map((id) => ({
    url: `${base}/beer/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...beerRoutes];
}
