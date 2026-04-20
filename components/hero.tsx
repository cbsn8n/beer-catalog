"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Beer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeerBubblesBackground } from "@/components/ui/beer-bubbles-background";
import { OPEN_LOGIN_EVENT } from "@/components/header";
import type { CatalogViewMode } from "@/lib/catalog-view";

export function Hero({
  mode,
  userName,
}: {
  mode: CatalogViewMode;
  userName?: string | null;
}) {
  const router = useRouter();
  const [addBusy, setAddBusy] = useState(false);

  const isPersonal = mode === "my";

  const scrollToFilters = () => {
    document.getElementById("beer-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openAddBeer = async () => {
    if (addBusy) return;
    setAddBusy(true);

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.user) {
        router.push("/beer/add");
      } else {
        window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT, {
          detail: { note: "Создай свою базу пива." },
        }));
      }
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <section
      className={`relative overflow-hidden py-16 sm:py-24 ${
        isPersonal
          ? "bg-gradient-to-br from-amber-100 via-orange-50 to-white"
          : "hero-beer-bg"
      }`}
    >
      {!isPersonal && <BeerBubblesBackground />}

      <div className="relative z-20 mx-auto max-w-7xl px-4 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div
            className={`mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm ${
              isPersonal
                ? "border border-amber-200 bg-white/85 text-amber-900"
                : "bg-white/20 text-white"
            }`}
          >
            {isPersonal ? "Твоя персональная база" : "Уникальный сервис подбора пива"}
          </div>
          <h1 className={`text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl ${isPersonal ? "text-amber-950" : "text-white"}`}>
            <span className="block">
              Beer<span className={isPersonal ? "text-amber-600" : "text-amber-100"}>vana</span>
            </span>
            <span
              className={`mt-3 block text-xl font-semibold tracking-normal sm:text-2xl md:text-3xl ${
                isPersonal ? "text-amber-800" : "text-orange-50"
              }`}
            >
              база пива от {isPersonal ? (userName || "тебя") : "Ивана"}
            </span>
          </h1>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-block">
              <Button
                size="lg"
                onClick={openAddBeer}
                disabled={addBusy}
                className="group relative min-h-16 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-10 py-7 text-lg font-bold text-amber-950 shadow-[0_0_35px_rgba(251,191,36,0.45)] transition-all duration-300 hover:shadow-[0_0_55px_rgba(251,191,36,0.65)]"
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <Beer className="relative z-10 mr-3 h-[2.6rem] w-[2.6rem] text-amber-800 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125" />
                <span className="relative z-10">Добавить пиво в базу</span>
              </Button>
            </motion.div>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToFilters}
              className={`min-h-16 rounded-full px-8 py-7 text-lg font-semibold backdrop-blur-sm ${
                isPersonal
                  ? "border-amber-300 bg-white text-amber-800 hover:bg-amber-50"
                  : "border-white/60 bg-white/80 text-amber-700 hover:bg-white/90"
              }`}
            >
              <span className="mr-2 text-xl leading-none">👇</span>
              {isPersonal ? "Выбрать пиво из моей базы" : "Выбрать пиво на вечер"}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
