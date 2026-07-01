import { PaymentTermType } from "@/generated/prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export const installmentInputSchema = z.object({
  label: z.string().optional(),
  percentage: z.number().positive().max(100),
  amount: z.number().min(0).optional(),
  dueDate: z.string().min(1),
  notes: z.string().optional(),
});

export type InstallmentInput = z.infer<typeof installmentInputSchema>;

export function parseInstallmentsJson(raw: string): InstallmentInput[] {
  if (!raw || raw === "[]") {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  return z.array(installmentInputSchema).parse(parsed);
}

export function parseLinkedIdsJson(raw: string): string[] {
  if (!raw || raw === "[]") {
    return [];
  }
  const parsed = JSON.parse(raw) as unknown;
  return z.array(z.string().min(1)).parse(parsed);
}

export function validateInstallmentPercentages(installments: InstallmentInput[]) {
  const total = installments.reduce((sum, row) => sum + row.percentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Installment percentages must total 100% (currently ${total.toFixed(2)}%).`);
  }
}

export function computeInstallmentAmounts(
  total: number | null | undefined,
  installments: InstallmentInput[],
): InstallmentInput[] {
  if (!total || total <= 0) {
    return installments;
  }
  return installments.map((row) => ({
    ...row,
    amount: row.amount ?? Math.round((total * row.percentage) / 100 * 100) / 100,
  }));
}

export function sumLineItemsTotal(
  lines: Array<{ quantity: number | { toString(): string }; unitPrice: number | { toString(): string } }>,
) {
  return lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );
}

export type InstallmentRow = {
  id: string;
  sortOrder: number;
  label: string | null;
  percentage: number;
  amount: number | null;
  dueDate: Date;
  paidAt: Date | null;
  notes: string | null;
};

export type UpcomingInstallment = {
  id: string;
  kind: "INCOMING" | "OUTGOING";
  poLabel: string;
  poHref: string;
  label: string | null;
  percentage: number;
  amount: number | null;
  dueDate: Date;
};

export async function getUpcomingInstallments(withinDays = 30): Promise<UpcomingInstallment[]> {
  const now = new Date();
  const until = new Date(now);
  until.setDate(until.getDate() + withinDays);

  const rows = await prisma.poPaymentInstallment.findMany({
    where: {
      paidAt: null,
      dueDate: { gte: now, lte: until },
      OR: [
        { poMasuk: { deletedAt: null } },
        { purchaseOrder: { deletedAt: null } },
      ],
    },
    orderBy: { dueDate: "asc" },
    include: {
      poMasuk: { select: { id: true, poNumber: true, distributorName: true, deletedAt: true } },
      purchaseOrder: {
        select: { id: true, documentNumber: true, orderToName: true, deletedAt: true },
      },
    },
  });

  return rows
    .filter((row) => {
      if (row.poMasukId) {
        return row.poMasuk && row.poMasuk.deletedAt === null;
      }
      return row.purchaseOrder && row.purchaseOrder.deletedAt === null;
    })
    .map((row) => {
      if (row.poMasuk) {
        return {
          id: row.id,
          kind: "INCOMING" as const,
          poLabel: row.poMasuk.poNumber ?? row.poMasuk.distributorName,
          poHref: `/admin/po-masuk/${row.poMasuk.id}`,
          label: row.label,
          percentage: Number(row.percentage),
          amount: row.amount ? Number(row.amount) : null,
          dueDate: row.dueDate,
        };
      }
      const po = row.purchaseOrder!;
      return {
        id: row.id,
        kind: "OUTGOING" as const,
        poLabel: po.documentNumber ?? po.orderToName ?? "(Draft)",
        poHref: `/admin/po-keluar/${po.id}/edit`,
        label: row.label,
        percentage: Number(row.percentage),
        amount: row.amount ? Number(row.amount) : null,
        dueDate: row.dueDate,
      };
    });
}

export async function replacePoMasukLinks(poMasukId: string, purchaseOrderIds: string[]) {
  await prisma.poMasukPurchaseOrderLink.deleteMany({ where: { poMasukId } });
  if (purchaseOrderIds.length === 0) {
    return;
  }
  await prisma.poMasukPurchaseOrderLink.createMany({
    data: purchaseOrderIds.map((purchaseOrderId) => ({ poMasukId, purchaseOrderId })),
    skipDuplicates: true,
  });
}

export async function replacePurchaseOrderLinks(purchaseOrderId: string, poMasukIds: string[]) {
  await prisma.poMasukPurchaseOrderLink.deleteMany({ where: { purchaseOrderId } });
  if (poMasukIds.length === 0) {
    return;
  }
  await prisma.poMasukPurchaseOrderLink.createMany({
    data: poMasukIds.map((poMasukId) => ({ poMasukId, purchaseOrderId })),
    skipDuplicates: true,
  });
}

export async function replacePoMasukInstallments(
  poMasukId: string,
  paymentTermType: PaymentTermType,
  installments: InstallmentInput[],
) {
  await prisma.poPaymentInstallment.deleteMany({ where: { poMasukId } });
  if (paymentTermType !== "TERMIN" || installments.length === 0) {
    return;
  }
  await prisma.poPaymentInstallment.createMany({
    data: installments.map((row, index) => ({
      poMasukId,
      sortOrder: index + 1,
      label: row.label?.trim() || null,
      percentage: row.percentage,
      amount: row.amount ?? null,
      dueDate: new Date(row.dueDate),
      notes: row.notes?.trim() || null,
    })),
  });
}

export async function replacePurchaseOrderInstallments(
  purchaseOrderId: string,
  paymentTermType: PaymentTermType,
  installments: InstallmentInput[],
) {
  await prisma.poPaymentInstallment.deleteMany({ where: { purchaseOrderId } });
  if (paymentTermType !== "TERMIN" || installments.length === 0) {
    return;
  }
  await prisma.poPaymentInstallment.createMany({
    data: installments.map((row, index) => ({
      purchaseOrderId,
      sortOrder: index + 1,
      label: row.label?.trim() || null,
      percentage: row.percentage,
      amount: row.amount ?? null,
      dueDate: new Date(row.dueDate),
      notes: row.notes?.trim() || null,
    })),
  });
}

export async function listOutgoingPoOptions() {
  return prisma.purchaseOrder.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: { id: true, documentNumber: true, orderToName: true, status: true },
  });
}

export async function listIncomingPoOptions() {
  return prisma.poMasuk.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: { id: true, poNumber: true, distributorName: true },
  });
}

export function toInstallmentRows(
  rows: Array<{
    id: string;
    sortOrder: number;
    label: string | null;
    percentage: { toString(): string } | number;
    amount: { toString(): string } | number | null;
    dueDate: Date;
    paidAt: Date | null;
    notes: string | null;
  }>,
): InstallmentRow[] {
  return rows.map((row) => ({
    id: row.id,
    sortOrder: row.sortOrder,
    label: row.label,
    percentage: Number(row.percentage),
    amount: row.amount != null ? Number(row.amount) : null,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    notes: row.notes,
  }));
}
