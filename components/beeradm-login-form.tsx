"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BeeradmLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/beeradm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || "Ошибка авторизации");
      }

      setPassword("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <span className="inline-flex items-center gap-2 font-medium">
          <Shield className="h-4 w-4" />
          Защищённая зона управления
        </span>
      </div>

      <div className="space-y-2">
        <label htmlFor="beeradm-password" className="block text-sm font-medium text-gray-700">
          Пароль админки
        </label>
        <Input
          id="beeradm-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Введите пароль"
          className="h-10"
          required
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Войти в beeradm
      </Button>
    </form>
  );
}

