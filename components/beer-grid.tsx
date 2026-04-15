"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { BeerCard } from "./beer-card";
import type { Beer } from "@/lib/types";

const PAGE_SIZE = 30;

interface BeerGridProps {
  beers: Beer[];
  sortControls?: React.ReactNode;
}

export function BeerGrid({ beers, sortControls }: BeerGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [beers]);

  const visible = useMemo(
    () => beers.slice(0, visibleCount),
    [beers, visibleCount]
  );

  const hasMore = visibleCount < beers.length;

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, beers.length));
        }
      },
      { rootMargin: "200px" }
    );
    const el = loaderRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, beers.length]);

  if (beers.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        Ничего не найдено. Попробуй изменить фильтры.
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">Найдено: {beers.length}</p>
        {sortControls}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((beer, i) => (
          <BeerCard key={beer.id} beer={beer} index={i} />
        ))}
      </div>
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </div>
      )}
    </section>
  );
}
