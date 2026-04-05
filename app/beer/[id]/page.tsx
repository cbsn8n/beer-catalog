import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Star, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BeerImageGallery } from "@/components/beer-image-gallery";
import type { Beer } from "@/lib/types";

const JSON_PATH = path.join(process.cwd(), "data", "beers.json");

function getBeer(id: number): Beer | null {
  if (!fs.existsSync(JSON_PATH)) return null;
  const beers = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8")) as Beer[];
  return beers.find((b) => b.id === id) || null;
}

const TRAITS: Record<keyof Beer["traits"], string> = {
  bitter: "Горчит",
  sour: "Кислит",
  fruity: "Фруктовое",
  smoked: "Копченое",
  watery: "Водянистое",
  spirity: "Спиртовое",
  socks: "Носки",
};

export default async function BeerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const beer = getBeer(Number(id));
  if (!beer) notFound();

  const activeTraits = Object.entries(beer.traits).filter(([, v]) => v);
  const rating = Math.max(0, Math.min(10, Math.round(beer.rating ?? 0)));
  const images = beer.images?.length
    ? beer.images.map((img) => ({
        local: img.local ? `${img.local}?w=1000&q=80` : null,
        remote: img.remote,
      }))
    : beer.image || beer.imageRemote
      ? [{ local: beer.image ? `${beer.image}?w=1000&q=80` : null, remote: beer.imageRemote ?? null }]
      : [];

  return (
    <>
      <Header />
      <main className="min-h-screen flex-1 bg-gradient-to-b from-amber-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Link href="/">
            <Button variant="ghost" className="mb-6 gap-2 pl-0">
              <ArrowLeft className="h-4 w-4" />
              Назад к каталогу
            </Button>
          </Link>

          <div className="grid gap-8 md:grid-cols-[420px_1fr]">
            <div>
              <BeerImageGallery images={images} alt={beer.name} />
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {beer.sort && <Badge>{beer.sort}</Badge>}
                {beer.type && <Badge variant="outline">{beer.type}</Badge>}
                {beer.filtration && <Badge variant="outline">{beer.filtration}</Badge>}
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                {beer.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-gray-600">
                {beer.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {beer.country}
                  </div>
                )}
                {beer.price != null && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {beer.price} ₽
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">Оценка</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <div className="font-semibold text-amber-700">{beer.rating ?? "—"}/10</div>
                </div>
              </div>

              {activeTraits.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-3 text-lg font-semibold">Характеристики</h2>
                  <div className="flex flex-wrap gap-2">
                    {activeTraits.map(([key]) => (
                      <Badge key={key} variant="secondary">
                        {TRAITS[key as keyof Beer["traits"]]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {beer.comment && (
                <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
                  <h2 className="mb-2 text-lg font-semibold">Комментарий</h2>
                  <p className="leading-7 text-gray-700">{beer.comment}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
