"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, ArrowUp, ArrowDown, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Beer } from "@/lib/types";

type EditableImage = {
  id: string;
  local: string | null;
  remote: string | null;
  preview: string;
  file?: File;
};

type FormState = {
  name: string;
  country: string;
  type: string;
  sort: string;
  filtration: string;
  price: string;
  rating: string;
  comment: string;
  traits: Beer["traits"];
};

const TRAITS: Array<{ key: keyof Beer["traits"]; label: string }> = [
  { key: "bitter", label: "Горчит" },
  { key: "sour", label: "Кислит" },
  { key: "fruity", label: "Фруктовое" },
  { key: "smoked", label: "Копченое" },
  { key: "watery", label: "Водянистое" },
  { key: "spirity", label: "Спиртовое" },
  { key: "socks", label: "Носки" },
];

type SelectFieldKey = "country" | "type" | "sort" | "filtration";
type SelectOptions = Record<SelectFieldKey, string[]>;

const EMPTY_SELECT_OPTIONS: SelectOptions = {
  country: [],
  type: [],
  sort: [],
  filtration: [],
};

const CUSTOM_OPTION_VALUE = "__custom__";

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "ru"));
}

function toForm(beer: Beer): FormState {
  return {
    name: beer.name || "",
    country: beer.country || "",
    type: beer.type || "",
    sort: beer.sort || "",
    filtration: beer.filtration || "",
    price: beer.price == null ? "" : String(beer.price),
    rating: beer.rating == null ? "" : String(beer.rating),
    comment: beer.comment || "",
    traits: {
      socks: Boolean(beer.traits?.socks),
      bitter: Boolean(beer.traits?.bitter),
      sour: Boolean(beer.traits?.sour),
      fruity: Boolean(beer.traits?.fruity),
      smoked: Boolean(beer.traits?.smoked),
      watery: Boolean(beer.traits?.watery),
      spirity: Boolean(beer.traits?.spirity),
    },
  };
}

function toImages(beer: Beer): EditableImage[] {
  const source: Array<{ local: string | null; remote: string | null; version?: number | null }> = beer.images?.length
    ? beer.images
    : beer.image || beer.imageRemote
      ? [{ local: beer.image, remote: beer.imageRemote ?? null, version: beer.imageVersion ?? null }]
      : [];

  return source
    .map((img, index) => {
      const local = img.local || null;
      const remote = img.remote || null;
      const preview = local
        ? `${local}${img.version ? `${local.includes("?") ? "&" : "?"}v=${img.version}` : ""}`
        : remote;
      if (!preview) return null;

      return {
        id: `existing-${index}-${local || remote}`,
        local,
        remote,
        preview,
      } satisfies EditableImage;
    })
    .filter((item): item is EditableImage => Boolean(item));
}

export function BeerAdminEditDialog({
  beer,
  open,
  onClose,
  onSaved,
  onDeleted,
}: {
  beer: Beer | null;
  open: boolean;
  onClose: () => void;
  onSaved: (beer: Beer) => void;
  onDeleted: (beerId: number) => void;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [images, setImages] = useState<EditableImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [selectOptions, setSelectOptions] = useState<SelectOptions>(EMPTY_SELECT_OPTIONS);
  const [customSelect, setCustomSelect] = useState<Record<SelectFieldKey, boolean>>({
    country: false,
    type: false,
    sort: false,
    filtration: false,
  });
  const blobUrlsRef = useRef<string[]>([]);

  const revokeAllBlobUrls = () => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
  };

  useEffect(() => {
    if (!open) {
      revokeAllBlobUrls();
      return;
    }
    if (!beer) return;

    let active = true;

    revokeAllBlobUrls();
    setForm(toForm(beer));
    setImages(toImages(beer));
    setBusy(false);
    setDeleteBusy(false);
    setError(null);
    setOk(null);

    const loadOptions = async () => {
      const res = await fetch("/api/beers", { cache: "no-store" });
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];

      const nextOptions: SelectOptions = {
        country: uniqueSorted(list.map((item) => item?.country)),
        type: uniqueSorted(list.map((item) => item?.type)),
        sort: uniqueSorted(list.map((item) => item?.sort)),
        filtration: uniqueSorted(list.map((item) => item?.filtration)),
      };

      if (!active) return;

      setSelectOptions(nextOptions);
      setCustomSelect({
        country: Boolean(beer.country && !nextOptions.country.includes(beer.country)),
        type: Boolean(beer.type && !nextOptions.type.includes(beer.type)),
        sort: Boolean(beer.sort && !nextOptions.sort.includes(beer.sort)),
        filtration: Boolean(beer.filtration && !nextOptions.filtration.includes(beer.filtration)),
      });
    };

    loadOptions().catch(() => {
      if (!active) return;
      setSelectOptions(EMPTY_SELECT_OPTIONS);
      setCustomSelect({
        country: true,
        type: true,
        sort: true,
        filtration: true,
      });
    });

    return () => {
      active = false;
    };
  }, [beer, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      revokeAllBlobUrls();
    };
  }, []);

  const canSubmit = useMemo(() => {
    if (!form) return false;
    return form.name.trim().length > 0 && !busy && !deleteBusy;
  }, [form, busy, deleteBusy]);

  const renderSelectableField = (key: SelectFieldKey, label: string, placeholder: string) => {
    if (!form) return null;

    const options = selectOptions[key];
    const value = form[key] || "";
    const inOptions = Boolean(value && options.includes(value));
    const useCustom = customSelect[key] || (Boolean(value) && !inOptions);
    const selectValue = useCustom ? CUSTOM_OPTION_VALUE : value;

    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
        <select
          value={selectValue}
          onChange={(e) => {
            const next = e.target.value;
            if (next === CUSTOM_OPTION_VALUE) {
              setCustomSelect((prev) => ({ ...prev, [key]: true }));
              return;
            }

            setCustomSelect((prev) => ({ ...prev, [key]: false }));
            setForm((prev) => (prev ? { ...prev, [key]: next } : prev));
          }}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">{placeholder}</option>
          {options.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value={CUSTOM_OPTION_VALUE}>+ Добавить новое значение…</option>
        </select>

        {useCustom && (
          <Input
            value={value}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, [key]: e.target.value } : prev))}
            placeholder="Введите новое значение"
            className="mt-2"
          />
        )}
      </div>
    );
  };

  if (!open || !beer || !form) return null;

  const moveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const item = prev[index];
      if (item?.file && item.preview.startsWith("blob:")) {
        URL.revokeObjectURL(item.preview);
        blobUrlsRef.current = blobUrlsRef.current.filter((url) => url !== item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const next: EditableImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const preview = URL.createObjectURL(file);
      blobUrlsRef.current.push(preview);
      next.push({
        id: `new-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        local: null,
        remote: null,
        preview,
        file,
      });
    }

    if (next.length > 0) {
      setImages((prev) => [...prev, ...next]);
    }
  };

  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.set("action", "upload");
    fd.set("beerId", String(beer.id));
    fd.set("imageFile", file);

    const res = await fetch("/api/beeradm/beers", {
      method: "POST",
      body: fd,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || typeof data?.localUrl !== "string") {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }

    return data.localUrl as string;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);
    setOk(null);

    try {
      const finalImages: Array<{ local: string | null; remote: string | null }> = [];

      for (const item of images) {
        if (item.file) {
          const localUrl = await uploadImage(item.file);
          finalImages.push({ local: localUrl, remote: null });
          continue;
        }

        finalImages.push({ local: item.local, remote: item.remote });
      }

      const res = await fetch("/api/beeradm/beers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beerId: beer.id,
          name: form.name,
          country: form.country,
          type: form.type,
          sort: form.sort,
          filtration: form.filtration,
          price: form.price,
          rating: form.rating,
          comment: form.comment,
          traits: form.traits,
          images: finalImages,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.beer) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setOk("Карточка сохранена");
      onSaved(data.beer as Beer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
    }
  };

  const removeBeer = async () => {
    const confirmed = window.confirm(`Удалить карточку \"${beer.name}\"? Она не вернется из NocoDB после sync.`);
    if (!confirmed) return;

    setDeleteBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/beeradm/beers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beerId: beer.id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      onDeleted(beer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/55 p-3 sm:p-6" onClick={onClose}>
      <div
        className="mx-auto max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Редактировать карточку</h2>
            <p className="text-sm text-gray-600">#{beer.id} • Все изменения сохраняются сразу в сайт-данные.</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={onClose} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Название *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                required
              />
            </div>
            {renderSelectableField("country", "Страна", "— Выберите страну —")}
            {renderSelectableField("type", "Тип", "— Выберите тип —")}
            {renderSelectableField("sort", "Сорт", "— Выберите сорт —")}
            {renderSelectableField("filtration", "Фильтрация", "— Выберите фильтрацию —")}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Цена (₽)</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={form.price}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Оценка (1-10)</label>
              <Input
                type="number"
                min={1}
                max={10}
                step={0.1}
                value={form.rating}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, rating: e.target.value } : prev))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Комментарий</label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((prev) => (prev ? { ...prev, comment: e.target.value } : prev))}
                className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium text-gray-700">Вкусовые признаки</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {TRAITS.map((trait) => (
                <label key={trait.key} className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.traits[trait.key]}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              traits: {
                                ...prev.traits,
                                [trait.key]: e.target.checked,
                              },
                            }
                          : prev
                      )
                    }
                  />
                  {trait.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-gray-800">Фото карточки</div>
              <label className="cursor-pointer rounded-md border px-3 py-1 text-sm hover:bg-gray-50">
                + Добавить фото
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mb-3 text-xs text-gray-500">Первое фото в списке = главное в карточке.</p>

            {images.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-gray-500">Фото пока нет</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((item, index) => (
                  <div key={item.id} className="rounded-lg border bg-white p-2">
                    <div className="mb-2 aspect-square overflow-hidden rounded bg-stone-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.preview} alt={`${form.name || beer.name} — фото ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="outline" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="outline" className="ml-auto text-red-600" onClick={() => removeImage(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {item.file && <div className="mt-1 text-[11px] text-emerald-700">Новый файл: {item.file.name}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="destructive" disabled={busy || deleteBusy} onClick={removeBeer} className="sm:w-auto">
              {deleteBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Удалить карточку
            </Button>
            <div className="flex gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy || deleteBusy}>Отмена</Button>
              <Button type="submit" disabled={!canSubmit}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
