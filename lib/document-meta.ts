import { DocumentLocale, DocumentType } from "@/generated/prisma/client";

import { getDocumentStrings } from "@/lib/document-i18n";

export const defaultIdrPaymentTransfer = [
  "Bank Name : BCA GIRO TDA",
  "Bank Account : 7485389610",
].join("\n");

export const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  PERFORM_INVOICE: "Perform Invoice",
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
