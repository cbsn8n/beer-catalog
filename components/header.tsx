"use client";

import { Beer, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Beer className="h-6 w-6 text-amber-600" />
          <span className="text-xl font-bold tracking-tight">Beervana</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled className="gap-2">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Войти</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
