"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireFileEditor } from "@/lib/roles";

export async function markInstallmentPaid(id: string) {
  await requireFileEditor();
  const row = await prisma.poPaymentInstallment.update({
    where: { id },
    data: { paidAt: new Date() },
    include: {
      poMasuk: { select: { id: true } },
      purchaseOrder: { select: { id: true } },
    },
  });

  revalidatePath("/admin/dashboard");
  if (row.poMasuk) {
    revalidatePath(`/admin/po-masuk/${row.poMasuk.id}`);
  }
  if (row.purchaseOrder) {
    revalidatePath(`/admin/po-keluar/${row.purchaseOrder.id}/edit`);
  }
}
