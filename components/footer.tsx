"use client";

import Link from "next/link";
import { Beer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-gray-600">
            <Beer className="h-5 w-5 text-amber-600" />
            <span className="font-semibold">Beervana</span>
          </div>
          <a href="https://yoomoney.ru/to/410011489257965" target="_blank" rel="noopener noreferrer" aria-label="Создателю на пиво" title="Создателю на пиво">
            <Button variant="outline" size="sm" className="gap-2 rounded-full border-amber-500 text-amber-600 hover:bg-amber-50">
              <Beer className="h-4 w-4 text-amber-600" />
              <span>Создателю на пиво</span>
            </Button>
          </a>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 sm:justify-end">
          <Link href="/privacy" className="transition-colors hover:text-gray-900">
            Политика конфиденциальности
          </Link>
          <Link href="/legal" className="transition-colors hover:text-gray-900">
            Правовая информация
          </Link>
        </div>
      </div>
    </footer>
  );
}
