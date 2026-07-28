import { DocumentLocale, DocumentType } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

const documentNumberPrefixes: Record<Exclude<DocumentType, "SPH">, string> = {
  INVOICE: "INV",
  PURCHASE_ORDER: "PO",
  SURAT_JALAN: "DO",
};

function buildClientSlug(name: string | null | undefined) {
  const slug = (name ?? "CLIENT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return slug.slice(0, 24) || "CLIENT";
}

export function formatTdaDocumentNumber(
  prefix: string,
  clientSlug: string,
  sequence: number,
  year: number,
) {
  return `${prefix}-TDA-${clientSlug}-${String(sequence).padStart(3, "0")}-${year}`;
}

export function formatSphDocumentNumber(sequence: number, year: number) {
  return `SPH/TDA/${String(sequence).padStart(3, "0")}/${year}`;
}

async function listDocumentNumbersForSequencing(
  type: DocumentType,
  yearStart: Date,
  yearEnd: Date,
) {
  const baseWhere = {
    ...notDeleted,
    issueDate: { gte: yearStart, lt: yearEnd },
    documentNumber: { not: null },
  };
  // SPH numbers are assigned on save (no finalize), so count any numbered SPH.
  // Other types still sequence from FINAL documents only.
  const where =
    type === "SPH"
      ? baseWhere
      : { ...baseWhere, status: "FINAL" as const };

  switch (type) {
    case "INVOICE":
      return prisma.invoice.findMany({ where, select: { documentNumber: true } });
    case "PURCHASE_ORDER":
      return prisma.purchaseOrder.findMany({ where, select: { documentNumber: true } });
    case "SURAT_JALAN":
      return prisma.suratJalan.findMany({ where, select: { documentNumber: true } });
    case "SPH":
      return prisma.sph.findMany({ where, select: { documentNumber: true } });
  }
}

export async function generateDocumentNumber(
  type: DocumentType,
  date: Date,
  options?: { clientName?: string | null },
) {
  const year = date.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const rows = await listDocumentNumbersForSequencing(type, yearStart, yearEnd);

  if (type === "SPH") {
    const pattern = new RegExp(String.raw`^SPH/TDA/(\d+)/${year}$`);
    const maxSequence = rows.reduce((max, row) => {
      const value = row.documentNumber;
      if (!value) return max;
      const match = pattern.exec(value);
      if (!match) return max;
      const seq = Number(match[1]);
      if (Number.isNaN(seq)) return max;
      return Math.max(max, seq);
    }, 0);

    return formatSphDocumentNumber(maxSequence + 1, year);
  }

  const prefix = documentNumberPrefixes[type];
  const clientSlug = buildClientSlug(options?.clientName);
  const pattern = new RegExp(String.raw`^${prefix}-TDA-${clientSlug}-(\d+)-${year}$`);

  const maxSequence = rows.reduce((max, row) => {
    const value = row.documentNumber;
    if (!value) return max;
    const match = pattern.exec(value);
    if (!match) return max;
    const seq = Number(match[1]);
    if (Number.isNaN(seq)) return max;
    return Math.max(max, seq);
  }, 0);

  return formatTdaDocumentNumber(prefix, clientSlug, maxSequence + 1, year);
}

function getNumberLocale(locale?: DocumentLocale | null) {
  return locale === "EN" ? "en-US" : "id-ID";
}

export function formatCurrency(amount: number, locale?: DocumentLocale | null) {
  return `IDR ${formatCurrencyAmount(amount, locale)}`;
}

export function formatCurrencyAmount(amount: number, locale?: DocumentLocale | null) {
  return new Intl.NumberFormat(getNumberLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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
