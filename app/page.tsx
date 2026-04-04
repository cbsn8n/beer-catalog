"use client";

import { useState, useMemo, useCallback } from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Filters } from "@/components/filters";
import { BeerGrid } from "@/components/beer-grid";
import { Footer } from "@/components/footer";
import { mockBeers } from "@/lib/mock-data";

export default function Home() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const toggleCountry = useCallback((country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  }, []);

  const filtered = useMemo(() => {
    return mockBeers.filter((beer) => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(beer.type)) return false;
      if (selectedCountries.length > 0 && !selectedCountries.includes(beer.country)) return false;
      if (minRating !== null && beer.rating < minRating) return false;
      if (beer.price < priceRange[0] || beer.price > priceRange[1]) return false;
      return true;
    });
  }, [selectedTypes, selectedCountries, minRating, priceRange]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <Filters
          selectedTypes={selectedTypes}
          selectedCountries={selectedCountries}
          minRating={minRating}
          priceRange={priceRange}
          onToggleType={toggleType}
          onToggleCountry={toggleCountry}
          onSetMinRating={setMinRating}
          onSetPriceRange={setPriceRange}
        />
        <BeerGrid beers={filtered} />
      </main>
      <Footer />
    </>
  );
}
