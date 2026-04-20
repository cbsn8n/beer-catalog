"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowDownAZ, ArrowUpDown, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Filters } from "@/components/filters";
import { BeerGrid } from "@/components/beer-grid";
import { BeerAdminEditDialog } from "@/components/beer-admin-edit-dialog";
import { Footer } from "@/components/footer";
import type { Beer } from "@/lib/types";
import type { UserView } from "@/lib/user-view";
import {
  CATALOG_VIEW_EVENT,
  CATALOG_VIEW_STORAGE_KEY,
  normalizeCatalogViewMode,
  type CatalogViewMode,
} from "@/lib/catalog-view";
import { getBeerPriceBounds, isBeerPriceInSelectedRange } from "@/lib/price-display";

const SORT_OPTIONS = [
  { value: "name", label: "По названию", icon: ArrowDownAZ },
  { value: "price", label: "По цене", icon: ArrowUpDown },
  { value: "rating", label: "По рейтингу", icon: Star },
] as const;

function getMaxPrice(beers: Beer[]) {
  const max = Math.max(...beers.map((beer) => getBeerPriceBounds(beer.price)?.max ?? 0), 100);
  return Math.ceil(max / 10) * 10;
}

function readCatalogMode() {
  if (typeof window === "undefined") return "all" as CatalogViewMode;
  return normalizeCatalogViewMode(window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY));
}

export function HomePageClient({
  initialIsAdmin,
  initialUser,
}: {
  initialIsAdmin: boolean;
  initialUser: UserView | null;
}) {
  const [publicBeers, setPublicBeers] = useState<Beer[]>([]);
  const [personalBeers, setPersonalBeers] = useState<Beer[]>([]);
  const [publicLoading, setPublicLoading] = useState(true);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);
  const [user, setUser] = useState<UserView | null>(initialUser);
  const [catalogMode, setCatalogMode] = useState<CatalogViewMode>("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "rating">("name");
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([1, 10]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);

  useEffect(() => {
    setCatalogMode(readCatalogMode());
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: CatalogViewMode }>).detail;
      setCatalogMode(normalizeCatalogViewMode(detail?.mode));
    };

    window.addEventListener(CATALOG_VIEW_EVENT, handler as EventListener);
    return () => window.removeEventListener(CATALOG_VIEW_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (!active) return;
        setUser(payload?.user ?? null);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/beers", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Beer[]) => {
        if (!active) return;
        setPublicBeers(data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (!active) return;
        setPublicLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (catalogMode !== "my" || !user) {
      setPersonalLoading(false);
      return;
    }

    let active = true;
    setPersonalLoading(true);
    setError(null);

    fetch("/api/user/base", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (!active) return;
        setPersonalBeers(Array.isArray(payload?.beers) ? payload.beers : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
      })
      .finally(() => {
        if (!active) return;
        setPersonalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catalogMode, user]);

  useEffect(() => {
    if (user || catalogMode !== "my") return;
    setCatalogMode("all");
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, "all");
  }, [user, catalogMode]);

  const sourceBeers = catalogMode === "my" && user ? personalBeers : publicBeers;

  useEffect(() => {
    setPriceRange([0, getMaxPrice(sourceBeers)]);
  }, [sourceBeers]);

  const maxPrice = useMemo(() => getMaxPrice(sourceBeers), [sourceBeers]);

  const toggleSort = useCallback((sort: string) => {
    setSelectedSorts((prev) =>
      prev.includes(sort) ? prev.filter((s) => s !== sort) : [...prev, sort]
    );
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  }, []);

  const toggleTrait = useCallback((trait: string) => {
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = sourceBeers.filter((beer) => {
      if (q && !beer.name.toLowerCase().includes(q)) return false;
      if (selectedSorts.length > 0 && (!beer.sort || !selectedSorts.includes(beer.sort))) return false;
      if (selectedCountries.length > 0 && (!beer.country || !selectedCountries.includes(beer.country))) return false;
      if (selectedTraits.some((trait) => !(beer.traits as Record<string, boolean>)[trait])) return false;
      if (beer.rating != null && (beer.rating < ratingRange[0] || beer.rating > ratingRange[1])) return false;
      if (!isBeerPriceInSelectedRange(beer.price, priceRange[0], priceRange[1])) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "price") {
        return (getBeerPriceBounds(a.price)?.min ?? Number.MAX_SAFE_INTEGER)
          - (getBeerPriceBounds(b.price)?.min ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortBy === "rating") {
        return (b.rating ?? -1) - (a.rating ?? -1);
      }
      return a.name.localeCompare(b.name, "ru");
    });
  }, [sourceBeers, searchQuery, selectedSorts, selectedCountries, selectedTraits, ratingRange, priceRange, sortBy]);

  const loading = publicLoading || (catalogMode === "my" && Boolean(user) && personalLoading);

  const personalDisplayName = useMemo(() => {
    if (!user) return null;
    if (user.first_name) return user.first_name;
    if (user.username) return user.username;
    return "тебя";
  }, [user]);

  const filtersTitle = catalogMode === "my"
    ? "Фильтры по моей базе"
    : "Выбери своё пиво на вечер:";

  const emptyText = catalogMode === "my"
    ? "В твоей базе пока нет пива. Добавь новое пиво или поставь оценку существующей карточке."
    : "Ничего не найдено. Попробуй изменить фильтры.";

  return (
    <>
      <Header initialUser={user} showCatalogSwitch />
      <main className="flex-1">
        <Hero mode={catalogMode} userName={personalDisplayName} backgroundImageUrl={user?.heroImageUrl || null} />
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">Ошибка загрузки: {error}</div>
        ) : (
          <>
            <Filters
              beers={sourceBeers}
              title={filtersTitle}
              selectedSorts={selectedSorts}
              selectedCountries={selectedCountries}
              selectedTraits={selectedTraits}
              ratingRange={ratingRange}
              priceRange={priceRange}
              maxPrice={maxPrice}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleSort={toggleSort}
              onToggleCountry={toggleCountry}
              onToggleTrait={toggleTrait}
              onSetRatingRange={setRatingRange}
              onSetPriceRange={setPriceRange}
            />
            <BeerGrid
              beers={filtered}
              isAdmin={initialIsAdmin}
              onEditBeer={setEditingBeer}
              emptyText={emptyText}
              sortControls={(
                <div className="w-full sm:w-auto">
                  <div className="sm:hidden">
                    <label htmlFor="beer-sort-mobile" className="mb-2 block text-sm font-medium text-gray-600">
                      Сортировка
                    </label>
                    <select
                      id="beer-sort-mobile"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden items-center gap-2 sm:flex">
                    {SORT_OPTIONS.map((option) => {
                      const Icon = option.icon;

                      return (
                        <Button
                          key={option.value}
                          type="button"
                          variant={sortBy === option.value ? "default" : "outline"}
                          size="sm"
                          className="gap-2"
                          onClick={() => setSortBy(option.value)}
                        >
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            />
          </>
        )}
      </main>
      <Footer />

      <BeerAdminEditDialog
        beer={editingBeer}
        open={Boolean(editingBeer)}
        onClose={() => setEditingBeer(null)}
        onSaved={(updatedBeer) => {
          setPublicBeers((prev) => prev.map((item) => (item.id === updatedBeer.id ? updatedBeer : item)));
          setPersonalBeers((prev) => prev.map((item) => (item.id === updatedBeer.id ? updatedBeer : item)));
          setEditingBeer(updatedBeer);
        }}
        onDeleted={(beerId) => {
          setPublicBeers((prev) => prev.filter((item) => item.id !== beerId));
          setPersonalBeers((prev) => prev.filter((item) => item.id !== beerId));
          setEditingBeer(null);
        }}
      />
    </>
  );
}
