import { DocumentLocale, DocumentType } from "@/generated/prisma/client";

import { getDocumentStrings } from "@/lib/document-i18n";

export const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  PURCHASE_ORDER: "Outgoing PO",
  SURAT_JALAN: "Delivery Note",
  SPH: "Quotation",
};

export function getDocumentTypeLabel(
  type: DocumentType,
  locale?: DocumentLocale | null,
): string {
  if (!locale) {
    return documentTypeLabels[type];
  }
  return getDocumentStrings(locale, type).documentTitle;
}
