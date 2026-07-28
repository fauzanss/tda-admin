"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteCompanyById } from "@/app/admin/settings/company/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function DeleteCompanyButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-red-200 text-red-700 hover:bg-red-50"
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
      {isPending ? (
        <>
          <Spinner size={14} className="text-current" />
          Deleting...
        </>
      ) : (
        "Delete"
      )}
    </Button>
  );
}
