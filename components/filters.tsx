"use client";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Beer } from "@/lib/types";
import { useMemo, useState } from "react";

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
  onSetAllCountries: (countries: string[]) => void;
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

const COUNTRY_LABELS: Record<string, string> = {
  "Россия": "RU Россия",
  "Германия": "DE Германия",
  "Германия ": "DE Германия",
  "Чехия": "CZ Чехия",
  "Бельгия": "BE Бельгия",
  "Литва": "LT Литва",
  "Польша": "PL Польша",
  "Тайланд": "TH Тайланд",
  "Вьетнам": "VN Вьетнам",
  "Япония": "JP Япония",
  "Мексика": "MX Мексика",
  "Нидерланды": "NL Нидерланды",
  "Испания": "ES Испания",
  "Италия": "IT Италия",
  "Ирландия": "IE Ирландия",
  "Франция": "FR Франция",
  "Великобритания": "UK Великобритания",
  "Латвия": "LV Латвия",
  "Белоруссия": "BY Белоруссия",
  "Китай": "CN Китай",
  "Корея": "KR Корея",
  "Австрия": "AT Австрия",
  "Казахстан": "KZ Казахстан",
  "Армения": "AM Армения",
  "Узбекистан": "UZ Узбекистан",
  "Бразилия": "BR Бразилия",
  "Канада": "CA Канада",
  "Дания": "DK Дания",
  "Шотландия": "SC Шотландия",
  "Эстония": "EE Эстония",
  "Малайзия": "MY Малайзия",
  "Тайвань": "TW Тайвань",
  "США": "US США",
};

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
  onSetAllCountries,
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
      if (b.country) map.set(b.country, (map.get(b.country) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [beers]);

  const visibleCountries = showAllCountries ? countries : countries.slice(0, 10);
  const maxRating = 10;
  const ratingRange: [number, number] = [minRating ?? 1, maxRating];

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Выбери своё пиво на вечер:</h2>
      <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
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
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setShowAllCountries((v) => !v)}
            >
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
                {COUNTRY_LABELS[country] || country.trim()}
              </Badge>
            ))}
          </div>
          {selectedCountries.length > 0 && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onSetAllCountries([])}>
                Сбросить выбор стран
              </Button>
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Рейтинг: от {ratingRange[0]}
          </h3>
          <Slider
            min={1}
            max={10}
            step={1}
            value={ratingRange}
            onValueChange={(v) => onSetMinRating((v as [number, number])[0] || null)}
            className="max-w-md rating-slider"
          />
        </div>

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
