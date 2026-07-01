"use server";

import { PaymentTermType } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { parseGdriveLinkFormFields } from "@/lib/google-drive";
import {
  computeInstallmentAmounts,
  parseInstallmentsJson,
  parseLinkedIdsJson,
  replacePoMasukInstallments,
  replacePoMasukLinks,
  validateInstallmentPercentages,
} from "@/lib/po-payment";
import { prisma } from "@/lib/prisma";
import { requireFileEditor } from "@/lib/roles";
import { notDeleted } from "@/lib/soft-delete";

const metadataSchema = z.object({
  poNumber: z.string().optional(),
  issueDate: z.string().optional(),
  distributorName: z.string().min(1),
  notes: z.string().optional(),
  paymentTermType: z.enum(["LUMP_SUM", "TERMIN"]),
  paymentTerms: z.string().optional(),
  totalAmount: z.string().optional(),
});

function toNullable(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetadata(formData: FormData) {
  return metadataSchema.parse({
    poNumber: String(formData.get("poNumber") ?? ""),
    issueDate: String(formData.get("issueDate") ?? ""),
    distributorName: String(formData.get("distributorName") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    paymentTermType: String(formData.get("paymentTermType") ?? "LUMP_SUM"),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    totalAmount: String(formData.get("totalAmount") ?? ""),
  });
}

function parsePaymentExtras(formData: FormData, paymentTermType: PaymentTermType, totalAmount: number | null) {
  const linkedPurchaseOrderIds = parseLinkedIdsJson(
    String(formData.get("linkedPurchaseOrderIds") ?? "[]"),
  );
  let installments = parseInstallmentsJson(String(formData.get("installments") ?? "[]"));
  if (paymentTermType === "TERMIN") {
    validateInstallmentPercentages(installments);
    installments = computeInstallmentAmounts(totalAmount, installments);
  } else {
    installments = [];
  }
  return { linkedPurchaseOrderIds, installments };
}

async function persistPoMasukExtras(
  poMasukId: string,
  paymentTermType: PaymentTermType,
  installments: ReturnType<typeof parsePaymentExtras>["installments"],
  linkedPurchaseOrderIds: string[],
) {
  await replacePoMasukInstallments(poMasukId, paymentTermType, installments);
  await replacePoMasukLinks(poMasukId, linkedPurchaseOrderIds);
}

export async function createPoMasuk(formData: FormData) {
  const userId = await requireFileEditor();
  const metadata = parseMetadata(formData);
  const totalAmount = metadata.totalAmount ? Number(metadata.totalAmount) : null;
  const { linkedPurchaseOrderIds, installments } = parsePaymentExtras(
    formData,
    metadata.paymentTermType,
    totalAmount,
  );
  const gdrive = parseGdriveLinkFormFields(formData, { required: true });
  if (!gdrive) {
    throw new Error("Google Drive link is required.");
  }

  const record = await prisma.poMasuk.create({
    data: {
      poNumber: toNullable(metadata.poNumber),
      issueDate: metadata.issueDate ? new Date(metadata.issueDate) : null,
      distributorName: metadata.distributorName.trim(),
      notes: toNullable(metadata.notes),
      paymentTermType: metadata.paymentTermType,
      paymentTerms: toNullable(metadata.paymentTerms),
      totalAmount,
      gdriveFileId: gdrive.gdriveFileId,
      gdriveFileName: gdrive.gdriveFileName,
      gdriveWebViewLink: gdrive.gdriveWebViewLink,
      createdById: userId,
    },
  });

  await persistPoMasukExtras(
    record.id,
    metadata.paymentTermType,
    installments,
    linkedPurchaseOrderIds,
  );

  revalidatePath("/admin/po-masuk");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/po-masuk/${record.id}`);
}

export async function updatePoMasuk(formData: FormData) {
  await requireFileEditor();
  const id = String(formData.get("id") ?? "");
  const metadata = parseMetadata(formData);
  const totalAmount = metadata.totalAmount ? Number(metadata.totalAmount) : null;
  const { linkedPurchaseOrderIds, installments } = parsePaymentExtras(
    formData,
    metadata.paymentTermType,
    totalAmount,
  );
  const gdrive = parseGdriveLinkFormFields(formData);

  const updated = await prisma.poMasuk.updateMany({
    where: { id, ...notDeleted },
    data: {
      poNumber: toNullable(metadata.poNumber),
      issueDate: metadata.issueDate ? new Date(metadata.issueDate) : null,
      distributorName: metadata.distributorName.trim(),
      notes: toNullable(metadata.notes),
      paymentTermType: metadata.paymentTermType,
      paymentTerms: toNullable(metadata.paymentTerms),
      totalAmount,
      ...(gdrive
        ? {
            gdriveFileId: gdrive.gdriveFileId,
            gdriveFileName: gdrive.gdriveFileName,
            gdriveWebViewLink: gdrive.gdriveWebViewLink,
          }
        : {}),
    },
  });

  if (updated.count === 0) {
    throw new Error("PO Masuk not found.");
  }

  await persistPoMasukExtras(id, metadata.paymentTermType, installments, linkedPurchaseOrderIds);

  revalidatePath("/admin/po-masuk");
  revalidatePath(`/admin/po-masuk/${id}`);
  revalidatePath("/admin/dashboard");
  redirect(`/admin/po-masuk/${id}`);
}

export async function deletePoMasuk(id: string) {
  await requireFileEditor();
  await prisma.poMasuk.updateMany({
    where: { id, ...notDeleted },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/po-masuk");
  revalidatePath("/admin/dashboard");
}
