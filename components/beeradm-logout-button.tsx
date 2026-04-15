"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BeeradmLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/beeradm/logout", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={logout} disabled={loading} className="gap-2">
      <LogOut className="h-4 w-4" />
      Выйти
    </Button>
  );
}

