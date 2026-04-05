import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import type { Beer } from "@/lib/types";

const prisma = new PrismaClient();
const JSON_PATH = path.join(process.cwd(), "data", "beers.json");

async function main() {
  if (!fs.existsSync(JSON_PATH)) throw new Error("data/beers.json not found");
  const beers = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as Beer[];

  console.log(`Importing ${beers.length} beers...`);

  for (const beer of beers) {
    await prisma.beer.upsert({
      where: { sourceId: beer.id },
      update: {
        name: beer.name,
        image: beer.image,
        imageRemote: beer.imageRemote,
        type: beer.type,
        sort: beer.sort,
        filtration: beer.filtration,
        country: beer.country,
        price: beer.price ?? undefined,
        rating: beer.rating,
        comment: beer.comment,
        socks: beer.traits.socks,
        bitter: beer.traits.bitter,
        sour: beer.traits.sour,
        fruity: beer.traits.fruity,
        smoked: beer.traits.smoked,
        watery: beer.traits.watery,
        spirity: beer.traits.spirity,
      },
      create: {
        sourceId: beer.id,
        name: beer.name,
        image: beer.image,
        imageRemote: beer.imageRemote,
        type: beer.type,
        sort: beer.sort,
        filtration: beer.filtration,
        country: beer.country,
        price: beer.price ?? undefined,
        rating: beer.rating,
        comment: beer.comment,
        socks: beer.traits.socks,
        bitter: beer.traits.bitter,
        sour: beer.traits.sour,
        fruity: beer.traits.fruity,
        smoked: beer.traits.smoked,
        watery: beer.traits.watery,
        spirity: beer.traits.spirity,
      },
    });
  }

  console.log("✅ Import complete");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
