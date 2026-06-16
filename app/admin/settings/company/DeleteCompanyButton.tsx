"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteCompanyById } from "@/app/admin/settings/company/actions";

export function DeleteCompanyButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      disabled={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          "Are you sure you want to delete this company?",
        );
        if (!confirmed) return;

        startTransition(async () => {
          await deleteCompanyById(id);
          router.refresh();
        });
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
