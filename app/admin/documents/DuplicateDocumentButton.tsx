"use client";

import { Copy } from "lucide-react";
import { DocumentType } from "@/generated/prisma/client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { duplicateDocument } from "@/app/admin/documents/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title="Duplicate"
      aria-label="Duplicate document"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await duplicateDocument(type, id);
          router.refresh();
        });
      }}
    >
      {isPending ? <Spinner size={16} className="text-current" /> : <Copy size={16} />}
    </Button>
  );
}
