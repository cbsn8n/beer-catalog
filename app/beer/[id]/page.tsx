import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Star, Tag } from "lucide-react";
import { getFlagSrc } from "@/lib/country-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BeerImageGallery } from "@/components/beer-image-gallery";
import { BeerContributionForm } from "@/components/beer-contribution-form";
import { BeerDetailAdminEdit } from "@/components/beer-detail-admin-edit";
import { LoginModalTriggerButton } from "@/components/login-modal-trigger-button";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { canAccessBeer, getBeerById } from "@/lib/beers-store";
import { getImageVersion } from "@/lib/image-versions";
import { formatBeerPriceApprox } from "@/lib/price-display";
import { formatBeerRating } from "@/lib/rating-display";
import { getUserBeerEntry, computeDisplayedBeerRating, getUserView } from "@/lib/user-base";
import { USER_COOKIE_NAME, verifyUserSessionToken } from "@/lib/user-auth";
import type { Beer } from "@/lib/types";

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
  const cookieStore = await cookies();
  const user = getUserView(verifyUserSessionToken(cookieStore.get(USER_COOKIE_NAME)?.value));
  const isAdmin = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  const beer = getBeerById(Number(id));
  if (!beer || !canAccessBeer(beer, { userId: user?.id, isAdmin })) {
    notFound();
  }

  const userBeerEntry = user ? getUserBeerEntry(user.id, beer.id) : null;
  const activeTraits = Object.entries(beer.traits).filter(([, v]) => v);
  const displayedRating = computeDisplayedBeerRating(beer);
  const rating = Math.max(0, Math.min(10, Math.round(displayedRating ?? 0)));
  const imageVersion = getImageVersion(beer.image);

  const images = beer.images?.length
    ? beer.images.map((img) => ({
        local: img.local,
        version: img.local ? getImageVersion(img.local) : null,
        remote: img.remote ?? null,
      }))
    : beer.image || beer.imageRemote
      ? [{ local: beer.image, version: imageVersion, remote: beer.imageRemote ?? null }]
      : [];

  const beerForAdminEdit: Beer = {
    ...beer,
    imageVersion,
    images: images.map((img) => ({
      local: img.local,
      remote: img.remote,
      version: img.version ?? null,
    })),
  };

  return (
    <>
      <Header initialUser={user} showCatalogSwitch={false} />
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
              <BeerImageGallery images={images} alt={beer.name} isAdmin={isAdmin} beerId={beer.id} />
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {beer.visibility === "user-only" && (
                  <Badge variant="secondary">Только в моей базе</Badge>
                )}
                {beer.sort && <Badge>{beer.sort}</Badge>}
                {beer.type && <Badge variant="outline">{beer.type}</Badge>}
                {beer.filtration && <Badge variant="outline">{beer.filtration}</Badge>}
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                {beer.name}
              </h1>

              <BeerDetailAdminEdit beer={beerForAdminEdit} isAdmin={isAdmin} />

              <div className="mt-4 flex flex-wrap items-center gap-4 text-gray-600">
                {beer.country && (
                  <div className="flex items-center gap-2">
                    <img src={getFlagSrc(beer.country)} alt="" className="h-4 w-6 rounded-[2px] object-cover shadow-sm" aria-hidden="true" />
                    {beer.country}
                  </div>
                )}
                {beer.price != null && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {formatBeerPriceApprox(beer.price)}
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">Общая оценка</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <div className="font-semibold text-amber-700">{formatBeerRating(displayedRating)}/10</div>
                </div>
              </div>

              {userBeerEntry && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <div className="mb-2 text-sm font-medium uppercase tracking-wide text-amber-700">Моя база</div>
                  <div className="space-y-3 text-sm text-amber-950">
                    <div>
                      <span className="font-semibold">Моя оценка:</span> {formatBeerRating(userBeerEntry.rating)}/10
                    </div>
                    {userBeerEntry.comment ? (
                      <div>
                        <div className="mb-1 font-semibold">Мой комментарий</div>
                        <div className="whitespace-pre-wrap rounded-lg border border-amber-200 bg-white px-3 py-2 text-gray-700">
                          {userBeerEntry.comment}
                        </div>
                      </div>
                    ) : null}
                    {userBeerEntry.addedByUser ? (
                      <div className="text-amber-800">Эта карточка уже есть в твоей личной базе.</div>
                    ) : null}
                  </div>
                </div>
              )}

              {activeTraits.length > 0 && (
                <div className="mt-8">
                  <h2 className="mb-3 text-lg font-semibold">Вкус</h2>
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
                  <p className="leading-7 text-gray-700 whitespace-pre-wrap">{beer.comment}</p>
                </div>
              )}

              <div className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
                <h2 className="mb-2 text-lg font-semibold">Добавить отзыв / фото / оценку</h2>
                {user ? (
                  <BeerContributionForm beerId={beer.id} />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">Чтобы собирать свою базу, нужно войти через Telegram.</p>
                    <LoginModalTriggerButton size="default">Войти</LoginModalTriggerButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
