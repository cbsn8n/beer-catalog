"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowDownAZ, ArrowUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Filters } from "@/components/filters";
import { BeerGrid } from "@/components/beer-grid";
import { Footer } from "@/components/footer";
import type { Beer } from "@/lib/types";

export default function Home() {
  const [beers, setBeers] = useState<Beer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price">("name");
  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
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

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = beers.filter((beer) => {
      if (q && !beer.name.toLowerCase().includes(q)) return false;
      if (selectedSorts.length > 0 && (!beer.sort || !selectedSorts.includes(beer.sort))) return false;
      if (selectedCountries.length > 0 && (!beer.country || !selectedCountries.includes(beer.country))) return false;
      if (beer.rating != null && (beer.rating < ratingRange[0] || beer.rating > ratingRange[1])) return false;
      if (beer.price != null && (beer.price < priceRange[0] || beer.price > priceRange[1])) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "price") {
        return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      }
      return a.name.localeCompare(b.name, "ru");
    });
  }, [beers, searchQuery, selectedSorts, selectedCountries, ratingRange, priceRange, sortBy]);

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
              ratingRange={ratingRange}
              priceRange={priceRange}
              maxPrice={maxPrice}
              searchQuery={searchQuery}
              sortBy={sortBy}
              onSearchChange={setSearchQuery}
              onSortByChange={setSortBy}
              onToggleSort={toggleSort}
              onToggleCountry={toggleCountry}
              onSetRatingRange={setRatingRange}
              onSetPriceRange={setPriceRange}
            />
            <BeerGrid
              beers={filtered}
              sortControls={(
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={sortBy === "name" ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setSortBy("name")}
                  >
                    <ArrowDownAZ className="h-4 w-4" />
                    По названию
                  </Button>
                  <Button
                    type="button"
                    variant={sortBy === "price" ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    onClick={() => setSortBy("price")}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                    По цене
                  </Button>
                </div>
              )}
            />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
