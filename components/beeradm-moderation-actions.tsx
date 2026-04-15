"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BeeradmModerationActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: "approve" | "reject") => {
    if (loading) return;
    setLoading(action);
    setError(null);

    try {
      const note = action === "reject" ? window.prompt("Причина отклонения (опционально):") || "" : "";

      const res = await fetch("/api/beeradm/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action, note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка модерации");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => run("approve")} disabled={Boolean(loading)}>
          {loading === "approve" ? "..." : "Одобрить"}
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => run("reject")} disabled={Boolean(loading)}>
          {loading === "reject" ? "..." : "Отклонить"}
        </Button>
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}

