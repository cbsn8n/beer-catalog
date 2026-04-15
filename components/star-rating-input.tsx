"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export function StarRatingInput({
  value,
  onChange,
  max = 10,
  label,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? value ?? 0;

  return (
    <div className="space-y-1">
      {label && <div className="text-sm font-medium text-gray-700">{label}</div>}
      <div
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-white px-2 py-2"
        onMouseLeave={() => setHover(null)}
      >
        {Array.from({ length: max }).map((_, idx) => {
          const n = idx + 1;
          const selected = n <= active;

          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => onChange(value === n ? null : n)}
              className="rounded p-0.5 transition hover:scale-105"
              aria-label={`Оценка ${n}`}
              title={`Оценка ${n}`}
            >
              <Star className={`h-5 w-5 ${selected ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            </button>
          );
        })}
      </div>
      <div className="text-xs text-gray-500">{value ? `Выбрано: ${value} / ${max}` : "Оценка не выбрана"}</div>
    </div>
  );
}

