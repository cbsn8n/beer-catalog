"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = {
  id: number;
  name: string;
  country: string | null;
  sort: string | null;
  preview: string | null;
  localImages: string[];
};

export function BeeradmImageTools() {
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/beeradm/images", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => x.name.toLowerCase().includes(q));
  }, [items, query]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runAction = async (payload: any, successMessage: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/beeradm/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setOk(successMessage);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка операции");
    } finally {
      setBusy(false);
    }
  };

  const rotateBeer = async (beerId: number, degrees: 90 | -90) => {
    await runAction(
      { action: "rotateBeer", beerId, degrees },
      `Фото карточки #${beerId} повернуты ${degrees > 0 ? "+90°" : "-90°"}`
    );
  };

  const rotateSelected = async (degrees: 90 | -90) => {
    if (selected.length === 0) return;
    await runAction(
      { action: "rotateManyBeers", beerIds: selected, degrees },
      `Выбранные карточки повернуты ${degrees > 0 ? "+90°" : "-90°"}`
    );
    setSelected([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск карточки по названию"
          className="h-10 sm:max-w-sm"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy || selected.length === 0} onClick={() => rotateSelected(90)} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Повернуть выбранные +90°
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy || selected.length === 0} onClick={() => rotateSelected(-90)} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Повернуть выбранные -90°
          </Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загружаю карточки...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Карточка</th>
                <th className="px-3 py-2 text-left">Фото</th>
                <th className="px-3 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t bg-white align-top">
                  <td className="px-3 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={selectedSet.has(item.id)} onChange={() => toggleSelect(item.id)} />
                      <span>{item.id}</span>
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/beer/${item.id}`} className="font-medium text-gray-900 hover:underline">
                      {item.name}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {item.country || "—"}
                      {item.sort ? ` • ${item.sort}` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-14 w-14 overflow-hidden rounded border bg-stone-100">
                        {item.preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.preview.includes("?") ? item.preview : `${item.preview}?w=140&q=65`} alt={item.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="text-xs text-gray-500">локальных фото: {item.localImages.length}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex flex-col gap-2 sm:flex-row">
                      <Button type="button" size="sm" variant="outline" disabled={busy || item.localImages.length === 0} onClick={() => rotateBeer(item.id, 90)}>
                        +90°
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={busy || item.localImages.length === 0} onClick={() => rotateBeer(item.id, -90)}>
                        -90°
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

