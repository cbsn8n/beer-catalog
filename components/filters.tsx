"use client";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { getFlagSrc } from "@/lib/country-meta";
import type { Beer } from "@/lib/types";
import { useMemo, useState } from "react";

interface FiltersProps {
  beers: Beer[];
  selectedSorts: string[];
  selectedCountries: string[];
  selectedTraits: string[];
  ratingRange: [number, number];
  priceRange: [number, number];
  maxPrice: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleSort: (t: string) => void;
  onToggleCountry: (c: string) => void;
  onToggleTrait: (trait: string) => void;
  onSetRatingRange: (range: [number, number]) => void;
  onSetPriceRange: (range: [number, number]) => void;
}

const SORT_COLORS: Record<string, string> = {
  "Лагер": "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100",
  "Пшеничное": "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100",
  "Пилснер": "border-lime-200 bg-lime-50 text-lime-800 hover:bg-lime-100",
  "Эль": "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  "Темное": "border-stone-300 bg-stone-100 text-stone-800 hover:bg-stone-200",
  "Янтарное": "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  "Портер": "border-neutral-300 bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
  "Стаут": "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
  "Фруктовое": "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100",
};

const TRAIT_LABELS: Record<string, string> = {
  bitter: "Горчит",
  sour: "Кислит",
  fruity: "Фруктовое",
  smoked: "Копченое",
  watery: "Водянистое",
  spirity: "Спиртовое",
  socks: "Носки",
};

export function Filters({
  beers,
  selectedSorts,
  selectedCountries,
  selectedTraits,
  ratingRange,
  priceRange,
  maxPrice,
  searchQuery,
  onSearchChange,
  onToggleSort,
  onToggleCountry,
  onToggleTrait,
  onSetRatingRange,
  onSetPriceRange,
}: FiltersProps) {
  const [showAllCountries, setShowAllCountries] = useState(false);

  const sorts = useMemo(() => {
    const map = new Map<string, number>();
    beers.forEach((b) => {
      if (b.sort) map.set(b.sort, (map.get(b.sort) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [beers]);

  const countries = useMemo(() => {
    const map = new Map<string, number>();
    beers.forEach((b) => {
      const c = b.country?.trim();
      if (c) map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [beers]);

  const visibleCountries = showAllCountries ? countries : countries.slice(0, 10);

  return (
    <section id="beer-filters" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Выбери своё пиво на вечер:</h2>
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по названию пива"
            className="pl-10"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Сорта</h3>
              <div className="flex flex-wrap gap-2">
                {sorts.map((sort) => {
                  const active = selectedSorts.includes(sort);
                  return (
                    <Badge
                      key={sort}
                      variant="outline"
                      className={`cursor-pointer select-none border transition-colors ${
                        active
                          ? "bg-amber-600 text-white border-amber-600 hover:bg-amber-700"
                          : SORT_COLORS[sort] || "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                      }`}
                      onClick={() => onToggleSort(sort)}
                    >
                      {sort}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Страны</h3>
                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setShowAllCountries((v) => !v)}>
                  {showAllCountries ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Все
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {visibleCountries.map((country) => (
                  <Badge
                    key={country}
                    variant={selectedCountries.includes(country) ? "default" : "outline"}
                    className="cursor-pointer select-none transition-colors hover:bg-amber-100"
                    onClick={() => onToggleCountry(country)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <img src={getFlagSrc(country)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm" aria-hidden="true" />
                      <span>{country}</span>
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Вкус</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TRAIT_LABELS).map(([key, label]) => {
                  const active = selectedTraits.includes(key);
                  return (
                    <Badge
                      key={key}
                      variant={active ? "default" : "outline"}
                      className="cursor-pointer select-none transition-colors hover:bg-amber-100"
                      onClick={() => onToggleTrait(key)}
                    >
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Рейтинг: от {ratingRange[0]} до {ratingRange[1]}
              </h3>
              <Slider min={1} max={10} step={1} value={ratingRange} onValueChange={(v) => onSetRatingRange(v as [number, number])} className="max-w-md rating-slider" />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Цена: {priceRange[0]}₽ — {priceRange[1]}₽
              </h3>
              <Slider min={0} max={maxPrice} step={10} value={priceRange} onValueChange={(v) => onSetPriceRange(v as [number, number])} className="max-w-md" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
