"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "beervana_cookie_notice_seen";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (!seen) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-[120] sm:left-6 sm:right-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg border bg-white/95 px-3 py-2 text-xs text-gray-700 shadow-md backdrop-blur">
        <p>
          Мы используем cookie и технические данные для работы сайта и аналитики.
        </p>
        <Button type="button" size="sm" onClick={accept}>
          Ок
        </Button>
      </div>
    </div>
  );
}
