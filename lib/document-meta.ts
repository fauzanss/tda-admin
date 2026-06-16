import { DocumentType } from "@prisma/client";

export const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  PURCHASE_ORDER: "Purchase Order",
  SURAT_JALAN: "Delivery Note",
  SPH: "Quotation",
};
