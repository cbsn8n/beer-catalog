"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type SyncState =
  | { type: "idle" }
  | { type: "ok"; message: string }
  | { type: "error"; message: string };

export function AdminSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<SyncState>({ type: "idle" });

  const runSync = async () => {
    if (loading) return;

    const confirmed = window.confirm(
      "Запустить синхронизацию с NocoDB? Это может занять до нескольких минут."
    );
    if (!confirmed) return;

    setLoading(true);
    setState({ type: "idle" });

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Сессия истекла. Войдите в beeradm заново.");
        }
        throw new Error(payload?.error || `HTTP ${res.status}`);
      }

      const beers = payload?.beers ?? "?";
      const downloaded = payload?.images?.downloaded ?? 0;
      const failed = payload?.images?.failed ?? 0;
      const msg = failed > 0
        ? `Готово: ${beers} позиций, скачано ${downloaded}, ошибок ${failed}`
        : `Готово: ${beers} позиций, скачано ${downloaded}`;

      setState({ type: "ok", message: msg });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка";
      setState({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={runSync} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        <span className="hidden sm:inline">Sync</span>
      </Button>

      {state.type !== "idle" && (
        <span className={`hidden text-xs md:inline ${state.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </div>
  );
}
