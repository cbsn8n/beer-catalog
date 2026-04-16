"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Beer, LogIn, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TelegramLoginWidget } from "@/components/telegram-login-widget";

type UserSession = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type TelegramConfig = {
  botUsername: string;
  authUrl: string;
  configured: boolean;
};

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (!active) return;
        setUser(payload?.user ?? null);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loginOpen) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLoginOpen(false);
      }
    };

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [loginOpen]);

  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.username) return `@${user.username}`;
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }, [user]);

  const loadTelegramConfig = async () => {
    if (telegramConfig || telegramLoading) return;

    setTelegramLoading(true);
    setTelegramError(null);
    try {
      const res = await fetch("/api/auth/telegram-config", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setTelegramConfig({
        botUsername: String(data?.botUsername || ""),
        authUrl: String(data?.authUrl || "/auth/telegram/callback"),
        configured: Boolean(data?.configured),
      });
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : "Не удалось загрузить конфиг входа");
    } finally {
      setTelegramLoading(false);
    }
  };

  const openLogin = () => {
    setLoginOpen(true);
    loadTelegramConfig().catch(() => null);
  };

  const logout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Beer className="h-6 w-6 text-amber-600" />
            <span className="text-xl font-bold tracking-tight">Beervana</span>
          </Link>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <>
                <span className="hidden max-w-36 truncate text-sm text-gray-700 sm:inline" title={displayName}>
                  {displayName}
                </span>
                <Button variant="outline" size="sm" onClick={logout} disabled={logoutLoading} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Выйти</span>
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="gap-2" onClick={openLogin}>
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Войти</span>
              </Button>
            )}

            <a href="https://yoomoney.ru/to/410011489257965" target="_blank" rel="noopener noreferrer" aria-label="Создателю на пиво" title="Создателю на пиво">
              <Button
                variant="outline"
                size="icon-sm"
                className="rounded-full border-amber-500 text-amber-600 hover:bg-amber-50 sm:hidden"
              >
                <Beer className="h-4 w-4 text-amber-600" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="hidden gap-2 rounded-full border-amber-500 text-amber-600 hover:bg-amber-50 sm:inline-flex"
              >
                <Beer className="h-4 w-4 text-amber-600" />
                <span>Создателю на пиво</span>
              </Button>
            </a>
          </div>
        </div>
      </header>

      {loginOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setLoginOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Войти через Telegram</h3>
              </div>
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setLoginOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {telegramLoading && (
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-600">Загружаю форму входа…</div>
            )}

            {telegramError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{telegramError}</div>
            )}

            {!telegramLoading && !telegramError && telegramConfig && !telegramConfig.configured && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Вход временно недоступен: не настроен Telegram бот.
              </div>
            )}

            {!telegramLoading && !telegramError && telegramConfig?.configured && (
              <div className="mt-2 flex justify-center">
                <TelegramLoginWidget
                  botUsername={telegramConfig.botUsername}
                  authUrl={telegramConfig.authUrl}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
