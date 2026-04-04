"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
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

  const [selectedSorts, setSelectedSorts] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);

  useEffect(() => {
    fetch("/api/beers")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Beer[]) => {
        setBeers(data);
        // Set price range to actual max
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

  const setAllCountries = useCallback((countries: string[]) => {
    setSelectedCountries(countries);
  }, []);

  const filtered = useMemo(() => {
    return beers.filter((beer) => {
      if (selectedSorts.length > 0 && (!beer.sort || !selectedSorts.includes(beer.sort)))
        return false;
      if (selectedCountries.length > 0 && (!beer.country || !selectedCountries.includes(beer.country)))
        return false;
      if (minRating !== null && (beer.rating == null || beer.rating < minRating))
        return false;
      if (beer.price != null && (beer.price < priceRange[0] || beer.price > priceRange[1]))
        return false;
      return true;
    });
  }, [beers, selectedSorts, selectedCountries, minRating, priceRange]);

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
          <div className="py-16 text-center text-red-500">
            Ошибка загрузки: {error}
          </div>
        ) : (
          <>
            <Filters
              beers={beers}
              selectedSorts={selectedSorts}
              selectedCountries={selectedCountries}
              minRating={minRating}
              priceRange={priceRange}
              maxPrice={maxPrice}
              onToggleSort={toggleSort}
              onToggleCountry={toggleCountry}
              onSetMinRating={setMinRating}
              onSetPriceRange={setPriceRange}
              onSetAllCountries={setAllCountries}
            />
            <BeerGrid beers={filtered} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
