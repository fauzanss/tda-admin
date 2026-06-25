"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  isAllowedPoMasukMimeType,
  PO_MASUK_MAX_FILE_SIZE_BYTES,
  uploadPoMasukFile,
} from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";
import { requireFileEditor } from "@/lib/roles";
import { notDeleted } from "@/lib/soft-delete";

const metadataSchema = z.object({
  poNumber: z.string().optional(),
  issueDate: z.string().optional(),
  distributorName: z.string().min(1),
  notes: z.string().optional(),
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
  });
}

function parseUploadFile(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("File is required.");
  }
  if (file.size > PO_MASUK_MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the 10 MB size limit.");
  }
  if (!isAllowedPoMasukMimeType(file.type)) {
    throw new Error("File type is not allowed. Use PDF, JPEG, PNG, or WebP.");
  }
  return file;
}

export async function createPoMasuk(formData: FormData) {
  const userId = await requireFileEditor();
  const metadata = parseMetadata(formData);
  const file = parseUploadFile(formData);
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadPoMasukFile(buffer, file.name, file.type);

  const record = await prisma.poMasuk.create({
    data: {
      poNumber: toNullable(metadata.poNumber),
      issueDate: metadata.issueDate ? new Date(metadata.issueDate) : null,
      distributorName: metadata.distributorName.trim(),
      notes: toNullable(metadata.notes),
      gdriveFileId: uploaded.fileId,
      gdriveFileName: uploaded.fileName,
      gdriveMimeType: uploaded.mimeType,
      gdriveWebViewLink: uploaded.webViewLink,
      createdById: userId,
    },
  });

  revalidatePath("/admin/po-masuk");
  redirect(`/admin/po-masuk/${record.id}`);
}

export async function updatePoMasuk(formData: FormData) {
  await requireFileEditor();
  const id = String(formData.get("id") ?? "");
  const metadata = parseMetadata(formData);

  const updated = await prisma.poMasuk.updateMany({
    where: { id, ...notDeleted },
    data: {
      poNumber: toNullable(metadata.poNumber),
      issueDate: metadata.issueDate ? new Date(metadata.issueDate) : null,
      distributorName: metadata.distributorName.trim(),
      notes: toNullable(metadata.notes),
    },
  });

  if (updated.count === 0) {
    throw new Error("PO Masuk not found.");
  }

  revalidatePath("/admin/po-masuk");
  revalidatePath(`/admin/po-masuk/${id}`);
  redirect(`/admin/po-masuk/${id}`);
}

export async function deletePoMasuk(id: string) {
  await requireFileEditor();
  await prisma.poMasuk.updateMany({
    where: { id, ...notDeleted },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/admin/po-masuk");
}
