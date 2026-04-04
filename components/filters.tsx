"use client";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import type { Beer } from "@/lib/types";
import { useMemo } from "react";

const RATINGS = [5, 6, 7, 8, 9];

interface FiltersProps {
  beers: Beer[];
  selectedSorts: string[];
  selectedCountries: string[];
  minRating: number | null;
  priceRange: [number, number];
  maxPrice: number;
  onToggleSort: (t: string) => void;
  onToggleCountry: (c: string) => void;
  onSetMinRating: (r: number | null) => void;
  onSetPriceRange: (range: [number, number]) => void;
}

export function Filters({
  beers,
  selectedSorts,
  selectedCountries,
  minRating,
  priceRange,
  maxPrice,
  onToggleSort,
  onToggleCountry,
  onSetMinRating,
  onSetPriceRange,
}: FiltersProps) {
  // Extract unique sorts and countries from data
  const sorts = useMemo(() => {
    const set = new Set<string>();
    beers.forEach((b) => { if (b.sort) set.add(b.sort); });
    return Array.from(set).sort();
  }, [beers]);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    beers.forEach((b) => {
      if (b.country) map.set(b.country, (map.get(b.country) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([c]) => c);
  }, [beers]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Выбери своё пиво на вечер:
      </h2>
      <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
        {/* Sorts */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Сорта
          </h3>
          <div className="flex flex-wrap gap-2">
            {sorts.map((sort) => (
              <Badge
                key={sort}
                variant={selectedSorts.includes(sort) ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors hover:bg-amber-100"
                onClick={() => onToggleSort(sort)}
              >
                {sort}
              </Badge>
            ))}
          </div>
        </div>

        {/* Countries */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Страны
          </h3>
          <div className="flex flex-wrap gap-2">
            {countries.map((country) => (
              <Badge
                key={country}
                variant={selectedCountries.includes(country) ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors hover:bg-amber-100"
                onClick={() => onToggleCountry(country)}
              >
                {country}
              </Badge>
            ))}
          </div>
        </div>

        {/* Rating */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Рейтинг
          </h3>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => (
              <Badge
                key={r}
                variant={minRating === r ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors hover:bg-amber-100"
                onClick={() => onSetMinRating(minRating === r ? null : r)}
              >
                от {r}
              </Badge>
            ))}
          </div>
        </div>

        {/* Price slider */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Цена: {priceRange[0]}₽ — {priceRange[1]}₽
          </h3>
          <Slider
            min={0}
            max={maxPrice}
            step={10}
            value={priceRange}
            onValueChange={(v) => onSetPriceRange(v as [number, number])}
            className="max-w-md"
          />
        </div>
      </div>
    </section>
  );
}
