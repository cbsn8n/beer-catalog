"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FormState = {
  name: string;
  country: string;
  type: string;
  sort: string;
  filtration: string;
  price: string;
  rating: string;
  comment: string;
  imageRemote: string;
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
  rating: "",
  comment: "",
  imageRemote: "",
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

export function AddBeerForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canSubmit = useMemo(() => form.name.trim().length > 0 && !loading, [form.name, loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        country: form.country.trim(),
        type: form.type.trim(),
        sort: form.sort.trim(),
        filtration: form.filtration.trim(),
        comment: form.comment.trim(),
        imageRemote: form.imageRemote.trim(),
        price: form.price.trim() ? Number(form.price) : null,
        rating: form.rating.trim() ? Number(form.rating) : null,
      };

      const res = await fetch("/api/beers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const newId = data?.beer?.id;
      setOk("Пиво добавлено в базу.");
      setForm(INITIAL_STATE);

      if (newId) {
        setTimeout(() => router.push(`/beer/${newId}`), 350);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка при добавлении");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Название *</label>
          <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Например: Franziskaner Weissbier" className="h-10" required />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Страна</label>
          <Input value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} placeholder="Германия" className="h-10" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Тип</label>
          <Input value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} placeholder="Светлое" className="h-10" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Сорт</label>
          <Input value={form.sort} onChange={(e) => setForm((s) => ({ ...s, sort: e.target.value }))} placeholder="Лагер" className="h-10" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Фильтрация</label>
          <Input value={form.filtration} onChange={(e) => setForm((s) => ({ ...s, filtration: e.target.value }))} placeholder="Фильтрованное" className="h-10" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Цена (₽)</label>
          <Input type="number" min={0} step={1} value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="180" className="h-10" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Оценка (1-10)</label>
          <Input type="number" min={1} max={10} step={1} value={form.rating} onChange={(e) => setForm((s) => ({ ...s, rating: e.target.value }))} placeholder="8" className="h-10" />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">URL фото (опционально)</label>
          <Input value={form.imageRemote} onChange={(e) => setForm((s) => ({ ...s, imageRemote: e.target.value }))} placeholder="https://..." className="h-10" />
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
        Добавить пиво
      </Button>
    </form>
  );
}

