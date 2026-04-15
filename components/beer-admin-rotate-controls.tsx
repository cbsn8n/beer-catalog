"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BeerAdminRotateControls({ beerId }: { beerId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cw" | "ccw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const rotate = async (degrees: 90 | -90) => {
    if (loading) return;
    setLoading(degrees === 90 ? "cw" : "ccw");
    setError(null);
    setOk(null);

    try {
      const res = await fetch("/api/beeradm/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotateBeer", beerId, degrees }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      setOk(`Фото повернуты ${degrees > 0 ? "+90°" : "-90°"}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка поворота");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 rounded-xl border bg-amber-50 p-3">
      <div className="mb-2 text-sm font-semibold text-amber-900">Админ: поворот фото</div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => rotate(90)} disabled={Boolean(loading)} className="gap-2">
          {loading === "cw" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Повернуть +90°
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => rotate(-90)} disabled={Boolean(loading)} className="gap-2">
          {loading === "ccw" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Повернуть -90°
        </Button>
      </div>
      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      {ok && <div className="mt-2 text-xs text-emerald-700">{ok}</div>}
    </div>
  );
}

