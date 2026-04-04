"use client";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

const TYPES = ["Лагер", "Пшеничка", "Хеллес", "Пилснер", "Темное", "Прочее"];
const COUNTRIES = [
  "Германия", "Чехия", "Бельгия", "Ирландия", "Япония",
  "Мексика", "Нидерланды", "Испания", "Италия", "Таиланд",
];
const RATINGS = [5, 6, 7, 8, 9];

interface FiltersProps {
  selectedTypes: string[];
  selectedCountries: string[];
  minRating: number | null;
  priceRange: [number, number];
  onToggleType: (t: string) => void;
  onToggleCountry: (c: string) => void;
  onSetMinRating: (r: number | null) => void;
  onSetPriceRange: (range: [number, number]) => void;
}

export function Filters({
  selectedTypes,
  selectedCountries,
  minRating,
  priceRange,
  onToggleType,
  onToggleCountry,
  onSetMinRating,
  onSetPriceRange,
}: FiltersProps) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Выбери своё пиво на вечер:
      </h2>
      <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
        {/* Types */}
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Сорта
          </h3>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <Badge
                key={type}
                variant={selectedTypes.includes(type) ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors hover:bg-amber-100"
                onClick={() => onToggleType(type)}
              >
                {type}
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
            {COUNTRIES.map((country) => (
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
            max={1000}
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
