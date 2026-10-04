import type { DocumentType } from "@/generated/prisma/client";

import { documentTypeLabels } from "@/lib/document-meta";

/** Build a filesystem-safe name for browser "Save as PDF" (uses document.title). */
export function buildDocumentPrintFileName(
  documentNumber: string | null | undefined,
  type: DocumentType,
) {
  const fallback = documentTypeLabels[type] || "Document";
  const raw = (documentNumber?.trim() || fallback).replace(/[\\/:*?"<>|]+/g, "-");
  return raw.replace(/-+/g, "-").replace(/^-|-$/g, "") || fallback;
}
