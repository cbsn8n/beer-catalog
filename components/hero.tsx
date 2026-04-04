"use client";

import { motion } from "framer-motion";
import { Beer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-amber-50 to-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
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
          <div className="mt-8">
            <Button size="lg" className="gap-2 bg-amber-600 hover:bg-amber-700" disabled>
              <Plus className="h-5 w-5" />
              Добавить пиво в базу
            </Button>
          </div>
        </motion.div>
      </div>

      {/* decorative circles */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
    </section>
  );
}
