"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Beer, LogIn, LogOut, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TelegramLoginWidget } from "@/components/telegram-login-widget";
import {
  CATALOG_VIEW_EVENT,
  CATALOG_VIEW_STORAGE_KEY,
  normalizeCatalogViewMode,
  type CatalogViewMode,
} from "@/lib/catalog-view";
import type { UserView } from "@/lib/user-view";

type TelegramConfig = {
  botUsername: string;
  authUrl: string;
  configured: boolean;
};

export const OPEN_LOGIN_EVENT = "beervana:open-login";

type LoginEventDetail = {
  note?: string;
};

function dispatchCatalogViewChange(mode: CatalogViewMode) {
  localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(CATALOG_VIEW_EVENT, { detail: { mode } }));
}

function readCatalogViewMode() {
  if (typeof window === "undefined") return "all" as CatalogViewMode;
  return normalizeCatalogViewMode(window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY));
}

function UserAvatar({ user }: { user: UserView }) {
  const displayName = user.first_name || user.username || "User";

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={displayName}
        className="h-9 w-9 rounded-full border border-amber-200 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 shadow-sm">
      <User className="h-4 w-4" />
    </div>
  );
}

function CatalogViewSwitch({
  value,
  onChange,
}: {
  value: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
}) {
  return (
    <div className="relative grid w-full max-w-[250px] grid-cols-2 rounded-[999px] bg-stone-200 p-1 text-[11px] font-semibold text-stone-700 shadow-inner sm:max-w-[296px] sm:text-sm">
      <span
        className={`pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-[999px] bg-white shadow-sm transition-transform duration-200 ${
          value === "all" ? "translate-x-0" : "translate-x-[100%]"
        }`}
      />
      <button
        type="button"
        className={`relative z-10 rounded-[999px] px-3 py-2 transition-colors ${
          value === "all" ? "text-amber-900" : "text-stone-600"
        }`}
        onClick={() => onChange("all")}
      >
        Общая база
      </button>
      <button
        type="button"
        className={`relative z-10 rounded-[999px] px-3 py-2 transition-colors ${
          value === "my" ? "text-amber-900" : "text-stone-600"
        }`}
        onClick={() => onChange("my")}
      >
        Моя база
      </button>
    </div>
  );
}

export function Header({
  initialUser = null,
  showCatalogSwitch = true,
}: {
  initialUser?: UserView | null;
  showCatalogSwitch?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserView | null>(initialUser);
  const [loading, setLoading] = useState(initialUser ? false : true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);
  const [loginNote, setLoginNote] = useState<string | null>(null);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [catalogMode, setCatalogMode] = useState<CatalogViewMode>("all");

  useEffect(() => {
    setCatalogMode(readCatalogViewMode());
  }, []);

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

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<LoginEventDetail>).detail;
      setLoginNote(detail?.note || null);
      setLoginOpen(true);
      loadTelegramConfig().catch(() => null);
    };

    window.addEventListener(OPEN_LOGIN_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, handler as EventListener);
  }, [telegramConfig, telegramLoading]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: CatalogViewMode }>).detail;
      setCatalogMode(normalizeCatalogViewMode(detail?.mode));
    };

    window.addEventListener(CATALOG_VIEW_EVENT, handler as EventListener);
    return () => window.removeEventListener(CATALOG_VIEW_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    if (user || catalogMode !== "my") return;
    setCatalogMode("all");
    dispatchCatalogViewChange("all");
  }, [user, catalogMode]);

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

  const openLogin = (note?: string) => {
    setLoginNote(note || null);
    setLoginOpen(true);
    loadTelegramConfig().catch(() => null);
  };

  const setViewMode = (mode: CatalogViewMode) => {
    if (mode === "my" && !user) {
      openLogin("Создай свою базу пива.");
      return;
    }

    setCatalogMode(mode);
    dispatchCatalogViewChange(mode);

    if (pathname !== "/") {
      router.push("/");
    }
  };

  const logout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setCatalogMode("all");
      dispatchCatalogViewChange("all");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center gap-3 sm:gap-4">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Beer className="h-6 w-6 text-amber-600" />
              <span className="text-xl font-bold tracking-tight">Beervana</span>
            </Link>

            {showCatalogSwitch && (
              <div className="hidden flex-1 justify-center md:flex">
                <CatalogViewSwitch value={catalogMode} onChange={setViewMode} />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {loading ? null : user ? (
                <>
                  <Link href="/me" className="flex items-center gap-2 rounded-full px-1 py-1 transition hover:bg-amber-50" title="Личный кабинет">
                    <UserAvatar user={user} />
                    <span className="hidden max-w-40 truncate text-sm font-medium text-gray-700 sm:inline" title={displayName}>
                      {displayName}
                    </span>
                  </Link>
                  <Button variant="outline" size="sm" onClick={logout} disabled={logoutLoading} className="gap-2">
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Выйти</span>
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" onClick={() => openLogin()}>
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Войти</span>
                </Button>
              )}
            </div>
          </div>

          {showCatalogSwitch && (
            <div className="pb-3 md:hidden">
              <div className="flex justify-center">
                <CatalogViewSwitch value={catalogMode} onChange={setViewMode} />
              </div>
            </div>
          )}
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
                {loginNote && <p className="mt-1 text-sm text-gray-600">{loginNote}</p>}
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
