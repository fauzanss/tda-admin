"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deletePoMasuk } from "@/app/admin/po-masuk/actions";

export function DeletePoMasukButton({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-link p-0 text-decoration-none text-danger"
      disabled={isPending}
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
      <i className={`bi ${isPending ? "bi-hourglass-split" : "bi-trash"}`} />
    </button>
  );
}
