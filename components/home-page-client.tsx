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

const SORT_OPTIONS = [
  { value: "name", label: "По названию", icon: ArrowDownAZ },
  { value: "price", label: "По цене", icon: ArrowUpDown },
  { value: "rating", label: "По рейтингу", icon: Star },
] as const;

export function HomePageClient({ initialIsAdmin }: { initialIsAdmin: boolean }) {
  const [beers, setBeers] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "rating">("name");
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([1, 10]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);

  useEffect(() => {
    fetch("/api/beers")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Beer[]) => {
        setBeers(data);
        const maxP = Math.max(...data.map((b) => b.price ?? 0), 100);
        setPriceRange([0, Math.ceil(maxP / 10) * 10]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const maxPrice = useMemo(() => {
    const m = Math.max(...beers.map((b) => b.price ?? 0), 100);
    return Math.ceil(m / 10) * 10;
  }, [beers]);

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
    const list = beers.filter((beer) => {
      if (q && !beer.name.toLowerCase().includes(q)) return false;
      if (selectedSorts.length > 0 && (!beer.sort || !selectedSorts.includes(beer.sort))) return false;
      if (selectedCountries.length > 0 && (!beer.country || !selectedCountries.includes(beer.country))) return false;
      if (selectedTraits.some((trait) => !(beer.traits as Record<string, boolean>)[trait])) return false;
      if (beer.rating != null && (beer.rating < ratingRange[0] || beer.rating > ratingRange[1])) return false;
      if (beer.price != null && (beer.price < priceRange[0] || beer.price > priceRange[1])) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "price") {
        return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortBy === "rating") {
        return (b.rating ?? -1) - (a.rating ?? -1);
      }
      return a.name.localeCompare(b.name, "ru");
    });
  }, [beers, searchQuery, selectedSorts, selectedCountries, selectedTraits, ratingRange, priceRange, sortBy]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500">Ошибка загрузки: {error}</div>
        ) : (
          <>
            <Filters
              beers={beers}
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
          setBeers((prev) => prev.map((item) => (item.id === updatedBeer.id ? updatedBeer : item)));
          setEditingBeer(updatedBeer);
        }}
        onDeleted={(beerId) => {
          setBeers((prev) => prev.filter((item) => item.id !== beerId));
          setEditingBeer(null);
        }}
      />
    </>
  );
}
