"use client";

import { useEffect, useState } from "react";

export function BeerDetailImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="group block w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-50 sm:aspect-square">
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="block h-full w-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] overflow-hidden bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full max-w-screen-lg">
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
              className="mx-auto block h-auto max-h-[85vh] w-full max-w-full rounded-2xl object-contain shadow-2xl"
            />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
