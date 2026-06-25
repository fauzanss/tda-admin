import { DocumentType } from "@/generated/prisma/client";

export const documentTypeLabels: Record<DocumentType, string> = {
  INVOICE: "Invoice",
  PURCHASE_ORDER: "PO Keluar",
  SURAT_JALAN: "Delivery Note",
  SPH: "Quotation",
};
