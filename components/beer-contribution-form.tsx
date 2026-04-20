"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StarRatingInput } from "@/components/star-rating-input";

export function BeerContributionForm({ beerId }: { beerId: number }) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !loading && (rating != null || comment.trim().length > 0 || Boolean(imageFile));
  }, [rating, comment, imageFile, loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const formData = new FormData();
      formData.set("kind", "beer-update");
      formData.set("beerId", String(beerId));
      if (rating != null) formData.set("rating", String(rating));
      if (comment.trim()) formData.set("comment", comment.trim());
      if (imageFile) formData.set("imageFile", imageFile);

      const res = await fetch("/api/moderation/submissions", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setRating(null);
      setComment("");
      setImageFile(null);

      if (data?.ratingApplied && data?.reviewQueued) {
        setOk("Сохранено: оценка сразу попала в твою базу, отзыв отправлен на модерацию.");
      } else if (data?.ratingApplied) {
        setOk("Оценка сразу сохранена в твоей базе.");
      } else if (data?.reviewQueued) {
        setOk("Отзыв сохранён в твоей базе и отправлен на модерацию для общей базы.");
      } else {
        setOk("Сохранено в твоей базе.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <StarRatingInput value={rating} onChange={setRating} label="Моя оценка" max={10} />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Добавить фото</label>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          className="h-10"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Комментарий</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ваш комментарий по этому пиву"
          className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Оценка попадает в твою базу сразу. Комментарий и фото отдельно уходят на модерацию для общей базы.
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

      <Button type="submit" disabled={!canSubmit}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Сохранить в мою базу
      </Button>
    </form>
  );
}
