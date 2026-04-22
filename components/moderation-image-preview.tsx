"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  localImage?: string | null;
  remoteImage?: string | null;
};

export function ModerationImagePreview({ title, localImage, remoteImage }: Props) {
  const router = useRouter();
  const [rotateBusy, setRotateBusy] = useState<"cw" | "ccw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const previewSrc = localImage
    ? `${localImage}${localImage.includes("?") ? "&" : "?"}v=${version || Date.now()}`
    : remoteImage || null;

  const rotate = async (degrees: 90 | -90) => {
    if (!localImage || rotateBusy) return;

    setRotateBusy(degrees === 90 ? "cw" : "ccw");
    setError(null);

    try {
      const res = await fetch("/api/beeradm/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotateImage", image: localImage, degrees }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setVersion(Date.now());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка поворота");
    } finally {
      setRotateBusy(null);
    }
  };

  if (!previewSrc) {
    return (
      <div className="rounded-xl border border-dashed bg-gray-50 px-4 py-6 text-sm text-gray-500">
        Фото не приложено.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewSrc} alt={title} className="h-72 w-full object-contain bg-white" />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
        {localImage ? (
          <a className="text-amber-700 underline" href={localImage} target="_blank" rel="noreferrer">
            локальное фото
          </a>
        ) : null}
        {remoteImage ? (
          <a className="text-amber-700 underline" href={remoteImage} target="_blank" rel="noreferrer">
            удалённое фото
          </a>
        ) : null}
      </div>

      {localImage ? (
        <div className="rounded-xl border bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Поворот фото в модерации
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={Boolean(rotateBusy)} onClick={() => rotate(90)}>
              {rotateBusy === "cw" ? "..." : "+90°"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={Boolean(rotateBusy)} onClick={() => rotate(-90)}>
              {rotateBusy === "ccw" ? "..." : "-90°"}
            </Button>
          </div>
          {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
