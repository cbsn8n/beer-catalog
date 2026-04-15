"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRatingInput } from "@/components/star-rating-input";
import type { Beer } from "@/lib/types";

type FormState = {
  name: string;
  country: string;
  type: string;
  sort: string;
  filtration: string;
  price: string;
  comment: string;
  traits: {
    socks: boolean;
    bitter: boolean;
    sour: boolean;
    fruity: boolean;
    smoked: boolean;
    watery: boolean;
    spirity: boolean;
  };
};

const INITIAL_STATE: FormState = {
  name: "",
  country: "",
  type: "",
  sort: "",
  filtration: "",
  price: "",
  comment: "",
  traits: {
    socks: false,
    bitter: false,
    sour: false,
    fruity: false,
    smoked: false,
    watery: false,
    spirity: false,
  },
};

const TRAITS: Array<{ key: keyof FormState["traits"]; label: string }> = [
  { key: "bitter", label: "Горчит" },
  { key: "sour", label: "Кислит" },
  { key: "fruity", label: "Фруктовое" },
  { key: "smoked", label: "Копченое" },
  { key: "watery", label: "Водянистое" },
  { key: "spirity", label: "Спиртовое" },
  { key: "socks", label: "Носки" },
];

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => (typeof v === "string" ? v.trim() : "")).filter((v) => v.length > 0))
  ).sort((a, b) => a.localeCompare(b, "ru"));
}

export function AddBeerForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [rating, setRating] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBeers, setLoadingBeers] = useState(true);
  const [beers, setBeers] = useState<Beer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/beers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setBeers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setBeers([]);
      })
      .finally(() => {
        if (!active) return;
        setLoadingBeers(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const query = form.name.trim().toLowerCase();

  const matches = useMemo(() => {
    if (query.length < 2) return [];
    return beers
      .filter((beer) => beer.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [beers, query]);

  const countryOptions = useMemo(() => uniqueSorted(beers.map((b) => b.country)), [beers]);
  const typeOptions = useMemo(() => uniqueSorted(beers.map((b) => b.type)), [beers]);
  const sortOptions = useMemo(() => uniqueSorted(beers.map((b) => b.sort)), [beers]);
  const filtrationOptions = useMemo(() => uniqueSorted(beers.map((b) => b.filtration)), [beers]);

  const showRestFields = query.length >= 2 && matches.length === 0;
  const canSubmit = showRestFields && form.name.trim().length > 1 && !loading;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const payload = new FormData();
      payload.set("kind", "new-beer");
      payload.set("name", form.name.trim());
      if (form.country.trim()) payload.set("country", form.country.trim());
      if (form.type.trim()) payload.set("type", form.type.trim());
      if (form.sort.trim()) payload.set("sort", form.sort.trim());
      if (form.filtration.trim()) payload.set("filtration", form.filtration.trim());
      if (form.price.trim()) payload.set("price", form.price.trim());
      if (rating != null) payload.set("rating", String(rating));
      if (form.comment.trim()) payload.set("comment", form.comment.trim());
      if (imageFile) payload.set("imageFile", imageFile);

      for (const trait of TRAITS) {
        if (form.traits[trait.key]) payload.set(`traits.${trait.key}`, "1");
      }

      const res = await fetch("/api/moderation/submissions", {
        method: "POST",
        body: payload,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setOk("Заявка отправлена на модерацию. После проверки пиво появится в базе.");
      setForm(INITIAL_STATE);
      setRating(null);
      setImageFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при отправке");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span className="inline-flex items-center gap-2 font-medium">
          <Search className="h-4 w-4" />
          Введите название нового пива — возможно, оно уже есть в нашей базе.
        </span>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Название *</label>
        <Input
          value={form.name}
          onChange={(e) => {
            setForm((s) => ({ ...s, name: e.target.value }));
            setError(null);
            setOk(null);
          }}
          placeholder="Например: Franziskaner Weissbier"
          className="h-10"
          required
        />
      </div>

      {loadingBeers ? (
        <div className="text-sm text-gray-500">Проверяю базу…</div>
      ) : query.length < 2 ? (
        <div className="text-sm text-gray-500">Начните вводить название (минимум 2 символа).</div>
      ) : matches.length > 0 ? (
        <div className="space-y-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Похоже, такое пиво уже есть в базе. Выберите существующую карточку:
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {matches.map((beer) => {
              const preview = beer.image ? `${beer.image}?w=120&q=60` : beer.imageRemote;

              return (
                <Link
                  key={beer.id}
                  href={`/beer/${beer.id}`}
                  className="rounded-lg border bg-white p-2 text-sm transition hover:border-amber-300 hover:bg-amber-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-stone-100">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={preview} alt={beer.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">no img</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900">{beer.name}</div>
                      <div className="truncate text-xs text-gray-500">
                        {beer.country || "Страна не указана"}
                        {beer.sort ? ` • ${beer.sort}` : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="text-sm text-gray-600">
            Открой карточку и добавь рейтинг / фото / комментарий — это тоже уйдёт на модерацию.
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Похоже, такого пива ещё нет в нашей базе. Заполните данные ниже — отправим на модерацию.
        </div>
      )}

      {showRestFields && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Фото пива (первое фото карточки)</label>
            <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} className="h-10" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Страна</label>
              <select
                value={form.country}
                onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">— Выберите страну —</option>
                {countryOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Тип</label>
              <select
                value={form.type}
                onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">— Выберите тип —</option>
                {typeOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Сорт</label>
              <select
                value={form.sort}
                onChange={(e) => setForm((s) => ({ ...s, sort: e.target.value }))}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">— Выберите сорт —</option>
                {sortOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Фильтрация</label>
              <select
                value={form.filtration}
                onChange={(e) => setForm((s) => ({ ...s, filtration: e.target.value }))}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">— Выберите фильтрацию —</option>
                {filtrationOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Цена (₽)</label>
              <Input type="number" min={0} step={1} value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="180" className="h-10" />
            </div>

            <div className="sm:col-span-2">
              <StarRatingInput value={rating} onChange={setRating} label="Оценка" max={10} />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Комментарий</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((s) => ({ ...s, comment: e.target.value }))}
                placeholder="Краткий комментарий по вкусу"
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Вкусовые признаки</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {TRAITS.map((trait) => (
                <label key={trait.key} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.traits[trait.key]}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        traits: { ...s.traits, [trait.key]: e.target.checked },
                      }))
                    }
                  />
                  {trait.label}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={!canSubmit}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Отправить на модерацию
          </Button>
        </>
      )}
    </form>
  );
}
