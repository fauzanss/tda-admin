"use client";

import { DocumentType } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { duplicateDocument } from "@/app/admin/documents/actions";

export function DuplicateDocumentButton({
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
      className="btn btn-link p-0 me-3 text-decoration-none"
      title="Duplicate"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await duplicateDocument(type, id);
          router.refresh();
        });
      }}
    >
      <i className={`bi ${isPending ? "bi-hourglass-split" : "bi-copy"}`} />
    </button>
  );
}
