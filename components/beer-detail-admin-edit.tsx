"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeerAdminEditDialog } from "@/components/beer-admin-edit-dialog";
import type { Beer } from "@/lib/types";

export function BeerDetailAdminEdit({ beer, isAdmin }: { beer: Beer; isAdmin: boolean }) {
  const router = useRouter();
  const [editingBeer, setEditingBeer] = useState<Beer | null>(null);

  if (!isAdmin) return null;

  return (
    <>
      <Button type="button" variant="outline" className="mt-4 gap-2" onClick={() => setEditingBeer(beer)}>
        <Pencil className="h-4 w-4" />
        Редактировать карточку
      </Button>

      <BeerAdminEditDialog
        beer={editingBeer}
        open={Boolean(editingBeer)}
        onClose={() => setEditingBeer(null)}
        onSaved={(updatedBeer) => {
          setEditingBeer(updatedBeer);
          router.refresh();
        }}
        onDeleted={() => {
          setEditingBeer(null);
          router.push("/");
          router.refresh();
        }}
      />
    </>
  );
}
