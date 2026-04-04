"use client";

import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Beer } from "@/lib/mock-data";

export function BeerCard({ beer, index }: { beer: Beer; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="group overflow-hidden transition-shadow hover:shadow-lg">
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beer.image}
            alt={beer.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <Badge className="absolute right-2 top-2 bg-white/90 text-gray-800 shadow-sm">
            {beer.type}
          </Badge>
        </div>
        <CardContent className="p-4">
          <h3 className="line-clamp-1 font-semibold text-gray-900">
            {beer.name}
          </h3>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {beer.country}
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {beer.rating.toFixed(1)}
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-gray-700">
            {beer.price.toFixed(0)} ₽
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
