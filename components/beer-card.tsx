"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Pencil, Star, Beer as BeerIcon } from "lucide-react";
import { getFlagSrc } from "@/lib/country-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Beer } from "@/lib/types";

export function BeerCard({
  beer,
  index,
  isAdmin = false,
  onEdit,
}: {
  beer: Beer;
  index: number;
  isAdmin?: boolean;
  onEdit?: (beer: Beer) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
        {isAdmin && (
          <div className="absolute left-2 top-2 z-20">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="bg-white/95"
              aria-label="Редактировать карточку"
              title="Редактировать карточку"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(beer);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <Link href={`/beer/${beer.id}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-stone-100">
            {beer.image ? (
              <div className="flex h-full w-full items-center justify-center overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${beer.image}?w=420&q=62${beer.imageVersion ? `&v=${beer.imageVersion}` : ""}`}
                  alt={beer.name}
                  className="block h-full w-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const remote = beer.imageRemote;
                    if (remote && e.currentTarget.src !== remote) e.currentTarget.src = remote;
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-amber-50 to-amber-100">
                <BeerIcon className="h-16 w-16 text-amber-300" />
              </div>
            )}
            {beer.sort && (
              <Badge className="absolute right-2 top-2 bg-white/90 text-gray-800 shadow-sm">
                {beer.sort}
              </Badge>
            )}
          </div>
          <CardContent className="p-4">
            <h3 className="line-clamp-1 font-semibold text-gray-900">{beer.name}</h3>
            <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
              {beer.country && (
                <span className="flex items-center gap-1.5">
                  <img src={getFlagSrc(beer.country)} alt="" className="h-3.5 w-5 rounded-[2px] object-cover shadow-sm" aria-hidden="true" />
                  {beer.country}
                </span>
              )}
              {beer.rating != null && (
                <span className="flex items-center gap-1 font-medium text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {beer.rating}
                </span>
              )}
            </div>
            {beer.price != null && <div className="mt-1 text-sm font-semibold text-gray-700">{beer.price} ₽</div>}
          </CardContent>
        </Link>
      </Card>
    </motion.div>
  );
}
