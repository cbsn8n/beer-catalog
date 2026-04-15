"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Beer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeerBubblesBackground } from "@/components/ui/beer-bubbles-background";

export function Hero() {
  const scrollToFilters = () => {
    document.getElementById("beer-filters")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="hero-beer-bg relative overflow-hidden py-16 sm:py-24">
      <BeerBubblesBackground />

      <div className="relative z-20 mx-auto max-w-7xl px-4 text-center sm:px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            Уникальный сервис подбора пива
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
            <span className="block">
              Beer<span className="text-amber-100">vana</span>
            </span>
            <span className="mt-3 block text-xl font-semibold tracking-normal text-orange-50 sm:text-2xl md:text-3xl">
              база пива от Ивана
            </span>
          </h1>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-block">
              <Link href="/beer/add">
                <Button
                  size="lg"
                  className="group relative min-h-16 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-10 py-7 text-lg font-bold text-amber-950 shadow-[0_0_35px_rgba(251,191,36,0.45)] transition-all duration-300 hover:shadow-[0_0_55px_rgba(251,191,36,0.65)]"
                >
                  <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Beer className="relative z-10 mr-3 h-[2.6rem] w-[2.6rem] text-amber-800 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-125" />
                  <span className="relative z-10">Добавить пиво в базу</span>
                </Button>
              </Link>
            </motion.div>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToFilters}
              className="min-h-16 rounded-full border-white/60 bg-white/80 px-8 py-7 text-lg font-semibold text-amber-700 backdrop-blur-sm hover:bg-white/90"
            >
              <span className="mr-2 text-xl leading-none">👇</span>
              Выбрать пиво на вечер
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
