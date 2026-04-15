"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BeerContributionForm({ beerId }: { beerId: number }) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [imageRemote, setImageRemote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !loading && (rating.trim().length > 0 || comment.trim().length > 0 || imageRemote.trim().length > 0);
  }, [rating, comment, imageRemote, loading]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setOk(null);

    try {
      const payload = {
        kind: "beer-update",
        beerId,
        rating: rating.trim() ? Number(rating) : null,
        comment: comment.trim(),
        imageRemote: imageRemote.trim(),
      };

      const res = await fetch("/api/moderation/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setRating("");
      setComment("");
      setImageRemote("");
      setOk("Изменения отправлены на модерацию.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Оценка (1-10)</label>
          <Input
            type="number"
            min={1}
            max={10}
            step={1}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="8"
            className="h-10"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">URL фото</label>
          <Input
            value={imageRemote}
            onChange={(e) => setImageRemote(e.target.value)}
            placeholder="https://..."
            className="h-10"
          />
        </div>
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
        Все изменения (оценка, комментарий, фото) публикуются после модерации.
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {ok && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div>}

      <Button type="submit" disabled={!canSubmit}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Отправить на модерацию
      </Button>
    </form>
  );
}

