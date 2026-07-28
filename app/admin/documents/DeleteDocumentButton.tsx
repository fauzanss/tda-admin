"use client";

import { Trash2 } from "lucide-react";
import { DocumentType } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteDocument } from "@/app/admin/documents/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
      title="Delete"
      aria-label="Delete document"
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
      {isPending ? <Spinner size={16} className="text-current" /> : <Trash2 size={16} />}
    </Button>
  );
}
