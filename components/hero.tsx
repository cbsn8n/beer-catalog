"use client";

import { motion } from "framer-motion";
import { Beer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function Bubbles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="hero-bubble absolute bottom-[-24px] rounded-full bg-white/25"
          style={{
            left: `${8 + i * 7.5}%`,
            width: `${10 + (i % 4) * 6}px`,
            height: `${10 + (i % 4) * 6}px`,
            animationDelay: `${(i % 6) * 0.6}s`,
            animationDuration: `${5 + (i % 5)}s`,
          }}
        />
      ))}
    </div>
  );
}

function Waves() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-wave hero-wave-1" />
      <div className="hero-wave hero-wave-2" />
      <div className="hero-wave hero-wave-3" />
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white py-16 sm:py-24">
      <Waves />
      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-medium text-amber-800">
            <Beer className="h-4 w-4" />
            Каталог пива
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Beer<span className="text-amber-600">vana</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-gray-600">
            База пива от Ивана
          </p>
          <div className="mt-10">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-block">
              <Button
                size="lg"
                className="group relative min-h-16 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 px-10 py-7 text-lg font-bold text-white shadow-[0_10px_30px_rgba(245,158,11,0.35)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(245,158,11,0.5)]"
              >
                <Bubbles />
                <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <Plus className="relative z-10 mr-2 h-6 w-6 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-125" />
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
