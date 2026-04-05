"use client";

import { useState } from "react";

export function BeerDetailImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="group block w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <div className="relative aspect-square overflow-hidden bg-stone-50">
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="block h-full w-auto max-w-none object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </button>

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
