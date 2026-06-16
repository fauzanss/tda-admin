"use client";

import { DocumentType } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteDocument } from "@/app/admin/documents/actions";

export function DeleteDocumentButton({
  type,
  id,
}: Readonly<{
  type: DocumentType;
  id: string;
}>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-link p-0 text-decoration-none text-danger"
      disabled={isPending}
      onClick={() => {
        const confirmed = globalThis.confirm(
          "Are you sure you want to delete this document?",
        );
        if (!confirmed) return;

        startTransition(async () => {
          await deleteDocument(type, id);
          router.refresh();
        });
      }}
    >
      <i className={`bi ${isPending ? "bi-hourglass-split" : "bi-trash"}`} />
    </button>
  );
}
