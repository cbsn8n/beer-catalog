"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waves } from "@/components/ui/wave-background";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-orange-500 via-amber-500 to-orange-200 py-16 sm:py-24">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-orange-500 via-amber-500 to-orange-200" />
      <div className="absolute inset-0 z-10 opacity-80">
        <Waves className="h-full w-full" lineColor="rgba(255,255,255,0.28)" backgroundColor="transparent" />
      </div>

      <div className="relative z-20 mx-auto max-w-7xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
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
          <div className="mt-10">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-block">
              <Button
                size="lg"
                className="group relative min-h-16 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 px-10 py-7 text-lg font-bold text-white shadow-[0_10px_30px_rgba(245,158,11,0.35)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(245,158,11,0.5)]"
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <Plus className="relative z-10 mr-3 h-8 w-8 stroke-[3] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-125" />
                <span className="relative z-10">Добавить пиво в базу</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
    </section>
  );
}
