"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { BeerImage } from "@/lib/types";

export function BeerImageGallery({ images, alt }: { images: BeerImage[]; alt: string }) {
  const normalized = useMemo(() => {
    const seen = new Set<string>();
    const result: { main: string; thumb: string }[] = [];

    for (const img of images) {
      const main = img.local || img.remote;
      const thumb = img.local ? `${img.local}${img.local.includes("?") ? "&" : "?"}w=240&q=44` : (img.remote || img.local);
      if (!main) continue;
      if (seen.has(main)) continue;
      seen.add(main);
      result.push({ main, thumb: thumb || main });
    }

    return result;
  }, [images]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  if (normalized.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl border bg-amber-50 text-amber-300 shadow-sm">
        No image
      </div>
    );
  }

  const current = normalized[active];
  const prev = () => setActive((v) => (v - 1 + normalized.length) % normalized.length);
  const next = () => setActive((v) => (v + 1) % normalized.length);

  return (
    <>
      <button
        type="button"
        className="group block w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <div className="relative aspect-square overflow-hidden bg-white">
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.main}
              alt={alt}
              className="block h-full w-auto max-w-none object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </button>

      {normalized.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {normalized.map((item, idx) => (
            <button
              key={item.main}
              type="button"
              onClick={() => setActive(idx)}
              className={`overflow-hidden rounded-2xl border bg-white ${idx === active ? "ring-2 ring-amber-500" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="aspect-square overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumb} alt={`${alt} ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-black shadow"
              onClick={() => setOpen(false)}
            >
              Закрыть
            </button>
            {normalized.length > 1 && (
              <>
                <button type="button" onClick={prev} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow">
                  <ChevronLeft className="h-5 w-5 text-black" />
                </button>
                <button type="button" onClick={next} className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow">
                  <ChevronRight className="h-5 w-5 text-black" />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.main} alt={alt} className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </>
  );
}
