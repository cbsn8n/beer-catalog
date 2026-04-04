"use client";

import { Beer } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-gray-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Beer className="h-5 w-5 text-amber-600" />
          <span className="font-semibold">Beervana</span>
        </div>
        <div className="flex gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-900 transition-colors">
            Политика конфиденциальности
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors">
            Правовая информация
          </a>
        </div>
      </div>
    </footer>
  );
}
