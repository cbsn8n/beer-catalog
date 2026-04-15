"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Beer, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type UserSession = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

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

  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.username) return `@${user.username}`;
    return [user.first_name, user.last_name].filter(Boolean).join(" ");
  }, [user]);

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
            <Link href="/login">
              <Button variant="outline" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Войти</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
