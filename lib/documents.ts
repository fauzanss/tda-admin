import { DocumentLocale, DocumentType } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

const documentPrefixes: Record<DocumentType, string> = {
  INVOICE: "INV/TDA",
  PURCHASE_ORDER: "PO/TDA",
  SURAT_JALAN: "SJ/TDA",
  SPH: "SPH/TDA",
};

export async function generateDocumentNumber(type: DocumentType, date: Date) {
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const prefix = documentPrefixes[type];
  const pattern = new RegExp(String.raw`^${prefix}/(\d+)/${year}$`);

  const where = {
    ...notDeleted,
    issueDate: { gte: yearStart, lt: yearEnd },
    status: "FINAL" as const,
    documentNumber: { not: null },
  };

  const numbersByType: Record<DocumentType, () => Promise<Array<{ documentNumber: string | null }>>> = {
    INVOICE: () => prisma.invoice.findMany({ where, select: { documentNumber: true } }),
    PURCHASE_ORDER: () =>
      prisma.purchaseOrder.findMany({ where, select: { documentNumber: true } }),
    SURAT_JALAN: () => prisma.suratJalan.findMany({ where, select: { documentNumber: true } }),
    SPH: () => prisma.sph.findMany({ where, select: { documentNumber: true } }),
  };

  const rows = await numbersByType[type]();
  const maxSequence = rows.reduce((max, row) => {
    const value = row.documentNumber;
    if (!value) return max;
    const match = pattern.exec(value);
    if (!match) return max;
    const seq = Number(match[1]);
    if (Number.isNaN(seq)) return max;
    return Math.max(max, seq);
  }, 0);

  const sequence = String(maxSequence + 1).padStart(3, "0");
  return `${prefix}/${sequence}/${year}`;
}

function getNumberLocale(locale?: DocumentLocale | null) {
  return locale === "EN" ? "en-US" : "id-ID";
}

export function formatCurrency(amount: number, locale?: DocumentLocale | null) {
  return `IDR ${new Intl.NumberFormat(getNumberLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export function formatLongDate(date: Date, locale?: DocumentLocale | null) {
  return date.toLocaleDateString(getNumberLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function parseNotes(notes: string) {
  return notes
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
