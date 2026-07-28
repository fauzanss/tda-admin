"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deletePoMasuk } from "@/app/admin/po-masuk/actions";
import { Button } from "@/components/ui/button";

export function DeletePoMasukButton({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="link"
      size="icon"
      className="text-red-600 hover:text-red-700"
      disabled={isPending}
      title="Delete"
      onClick={() => {
        const confirmed = globalThis.confirm(
          "Are you sure you want to delete this PO Masuk?",
        );
        if (!confirmed) return;

        startTransition(async () => {
          await deletePoMasuk(id);
          router.refresh();
        });
      }}
    >
      {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </Button>
  );
}
