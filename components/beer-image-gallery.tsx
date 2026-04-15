"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BeerImage } from "@/lib/types";

type SearchResult = {
  title: string;
  imageUrl: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
};

export function BeerImageGallery({
  images,
  alt,
  isAdmin = false,
  beerId,
}: {
  images: BeerImage[];
  alt: string;
  isAdmin?: boolean;
  beerId?: number;
}) {
  const router = useRouter();

  const normalized = useMemo(() => {
    const seen = new Set<string>();
    const result: { main: string; thumb: string; local: string | null }[] = [];

    for (const img of images) {
      const localWithVersion = img.local
        ? `${img.local}${img.version ? `${img.local.includes("?") ? "&" : "?"}v=${img.version}` : ""}`
        : null;

      const main = localWithVersion || img.remote;
      const thumb = localWithVersion
        ? `${localWithVersion}${localWithVersion.includes("?") ? "&" : "?"}w=240&q=44`
        : (img.remote || localWithVersion);

      if (!main) continue;
      if (seen.has(main)) continue;
      seen.add(main);
      result.push({ main, thumb: thumb || main, local: img.local || null });
    }

    return result;
  }, [images]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [rotateBusy, setRotateBusy] = useState<"cw" | "ccw" | null>(null);
  const [rotateMsg, setRotateMsg] = useState<string | null>(null);
  const [rotateErr, setRotateErr] = useState<string | null>(null);
  const [searchBusy, setSearchBusy] = useState<"lens" | "name" | null>(null);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [applyBusyUrl, setApplyBusyUrl] = useState<string | null>(null);

  useEffect(() => {
    if (active >= normalized.length) {
      setActive(0);
    }
  }, [normalized.length, active]);

  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (normalized.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-3xl border bg-amber-50 text-amber-300 shadow-sm">
        No image
      </div>
    );
  }

  const activeIndex = Math.max(0, Math.min(active, normalized.length - 1));
  const current = normalized[activeIndex] || normalized[0];
  const prev = () => {
    setActive((v) => (v - 1 + normalized.length) % normalized.length);
  };
  const next = () => {
    setActive((v) => (v + 1) % normalized.length);
  };

  const rotateCurrent = async (degrees: 90 | -90) => {
    if (!isAdmin || !current?.local || rotateBusy) return;

    setRotateBusy(degrees === 90 ? "cw" : "ccw");
    setRotateErr(null);
    setRotateMsg(null);

    try {
      const res = await fetch("/api/beeradm/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotateImage", image: current.local, degrees }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setRotateMsg(`Повернуто ${degrees > 0 ? "+90°" : "-90°"}`);
      router.refresh();
    } catch (err) {
      setRotateErr(err instanceof Error ? err.message : "Ошибка поворота");
    } finally {
      setRotateBusy(null);
    }
  };

  const runSearch = async (mode: "lens" | "name") => {
    if (!isAdmin || searchBusy) return;

    setSearchBusy(mode);
    setSearchErr(null);
    setSearchResults([]);

    try {
      const payload = mode === "lens"
        ? { mode, imageUrl: current.main }
        : { mode, query: alt };

      const res = await fetch("/api/beeradm/image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setSearchResults(Array.isArray(data?.results) ? data.results : []);
    } catch (err) {
      setSearchErr(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      setSearchBusy(null);
    }
  };

  const applyAsPrimary = async (result: SearchResult) => {
    if (!isAdmin || !beerId || applyBusyUrl) return;

    setApplyBusyUrl(result.imageUrl);
    setSearchErr(null);

    try {
      const res = await fetch("/api/beeradm/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setPrimaryFromRemote",
          beerId,
          imageUrl: result.imageUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setRotateMsg("Новое фото установлено первым в карточке");
      router.refresh();
    } catch (err) {
      setSearchErr(err instanceof Error ? err.message : "Ошибка применения фото");
    } finally {
      setApplyBusyUrl(null);
    }
  };

  return (
    <>
      <button
        type="button"
        className="group block w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
        onClick={() => setOpen(true)}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-white sm:aspect-square">
          <div className="flex h-full w-full items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.main}
              alt={alt}
              className="block h-full w-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const fallback = images[activeIndex]?.remote;
                if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
              }}
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
              className={`overflow-hidden rounded-2xl border bg-white ${idx === activeIndex ? "ring-2 ring-amber-500" : "opacity-90 hover:opacity-100"}`}
            >
              <div className="aspect-square overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb}
                  alt={`${alt} ${idx + 1}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const fallback = images[idx]?.remote;
                    if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {isAdmin && current?.local && (
        <div className="mt-3 rounded-xl border bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Админ: поворот выбранного фото
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={Boolean(rotateBusy)} onClick={() => rotateCurrent(90)}>
              {rotateBusy === "cw" ? "..." : "+90°"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={Boolean(rotateBusy)} onClick={() => rotateCurrent(-90)}>
              {rotateBusy === "ccw" ? "..." : "-90°"}
            </Button>
            <span className="text-xs text-gray-600">Будет повернуто только текущее выбранное фото</span>
          </div>
          {rotateErr && <div className="mt-2 text-xs text-red-600">{rotateErr}</div>}
          {rotateMsg && <div className="mt-2 text-xs text-emerald-700">{rotateMsg}</div>}

          <div className="mt-3 border-t border-amber-200 pt-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Поиск более качественного фото
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={Boolean(searchBusy)} onClick={() => runSearch("lens")}>
                {searchBusy === "lens" ? "Ищу..." : "Поиск по картинке"}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={Boolean(searchBusy)} onClick={() => runSearch("name")}>
                {searchBusy === "name" ? "Ищу..." : "Поиск по названию"}
              </Button>
            </div>

            {searchErr && <div className="mt-2 text-xs text-red-600">{searchErr}</div>}

            {searchResults.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {searchResults.map((res) => (
                  <div key={res.imageUrl} className="overflow-hidden rounded-lg border bg-white">
                    <div className="aspect-square overflow-hidden bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={res.imageUrl} alt={res.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-1 p-2">
                      <div className="line-clamp-2 text-[11px] text-gray-700" title={res.title}>{res.title}</div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={Boolean(applyBusyUrl)}
                        onClick={() => applyAsPrimary(res)}
                      >
                        {applyBusyUrl === res.imageUrl ? "Применяю..." : "Сделать основным"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
              {normalized.length > 1 && (
                <>
                  <button type="button" onClick={prev} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow sm:left-3">
                    <ChevronLeft className="h-5 w-5 text-black" />
                  </button>
                  <button type="button" onClick={next} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow sm:right-3">
                    <ChevronRight className="h-5 w-5 text-black" />
                  </button>
                </>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.main}
                alt={alt}
                className="mx-auto block h-auto max-h-[85vh] w-full max-w-full rounded-2xl object-contain shadow-2xl"
                onError={(e) => {
                  const fallback = images[activeIndex]?.remote;
                  if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
