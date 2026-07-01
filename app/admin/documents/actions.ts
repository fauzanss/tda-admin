"use server";

import {
  DocumentLocale,
  DocumentStatus,
  DocumentType,
  PaymentTermType,
  Prisma,
} from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireFileEditor } from "@/lib/roles";
import { generateDocumentNumber } from "@/lib/documents";
import { parseGdriveLinkFormFields } from "@/lib/google-drive";
import {
  computeInstallmentAmounts,
  parseInstallmentsJson,
  parseLinkedIdsJson,
  replacePurchaseOrderInstallments,
  replacePurchaseOrderLinks,
  sumLineItemsTotal,
  validateInstallmentPercentages,
} from "@/lib/po-payment";
import {
  getDocumentEditPath,
  getDocumentListPath,
  getDocumentPreviewPath,
} from "@/lib/document-paths";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

const lineSchema = z.object({
  description: z.string().min(1),
  detail: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  unitPrice: z.number().min(0),
});

const formSchema = z.object({
  type: z.nativeEnum(DocumentType),
  locale: z.enum(["EN", "ID"]),
  withSignature: z.enum(["true", "false"]),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  documentNumber: z.string().optional(),
  subject: z.string().optional(),
  referencePoNumber: z.string().optional(),
  referenceBastSjNumber: z.string().optional(),
  customerReference: z.string().optional(),
  salesPerson: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  deliveryNotes: z.string().optional(),
  billToName: z.string().optional(),
  billToAddress: z.string().optional(),
  deliveredToName: z.string().optional(),
  deliveredToAddress: z.string().optional(),
  fromName: z.string().optional(),
  fromAddress: z.string().optional(),
  toName: z.string().optional(),
  toAddress: z.string().optional(),
  notesText: z.string().optional(),
  additionalNotesText: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

function toNullable(value: string | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLines(raw: string): z.infer<typeof lineSchema>[] {
  const parsed = JSON.parse(raw) as z.infer<typeof lineSchema>[];
  return parsed;
}


function buildDocumentInput(formData: FormData) {
  const payload = formSchema.parse({
    type: formData.get("type"),
    locale: String(formData.get("locale") ?? "ID"),
    withSignature: String(formData.get("withSignature") ?? "true"),
    issueDate: String(formData.get("issueDate") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    documentNumber: String(formData.get("documentNumber") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    referencePoNumber: String(formData.get("referencePoNumber") ?? ""),
    referenceBastSjNumber: String(formData.get("referenceBastSjNumber") ?? ""),
    customerReference: String(formData.get("customerReference") ?? ""),
    salesPerson: String(formData.get("salesPerson") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    paymentTerms: String(formData.get("paymentTerms") ?? ""),
    deliveryNotes: String(formData.get("deliveryNotes") ?? ""),
    billToName: String(formData.get("billToName") ?? ""),
    billToAddress: String(formData.get("billToAddress") ?? ""),
    deliveredToName: String(formData.get("deliveredToName") ?? ""),
    deliveredToAddress: String(formData.get("deliveredToAddress") ?? ""),
    fromName: String(formData.get("fromName") ?? ""),
    fromAddress: String(formData.get("fromAddress") ?? ""),
    toName: String(formData.get("toName") ?? ""),
    toAddress: String(formData.get("toAddress") ?? ""),
    notesText: String(formData.get("notesText") ?? ""),
    additionalNotesText: String(formData.get("additionalNotesText") ?? ""),
    lines: normalizeLines(String(formData.get("lines") ?? "[]")),
  });

  const issueDate = new Date(payload.issueDate);
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  const notes = payload.notesText
    ? payload.notesText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
  const additionalNotes = payload.additionalNotesText
    ? payload.additionalNotesText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    type: payload.type,
    locale: payload.locale as DocumentLocale,
    withSignature: payload.withSignature === "true",
    issueDate,
    dueDate,
    documentNumber: toNullable(payload.documentNumber),
    subject: toNullable(payload.subject),
    referencePoNumber: toNullable(payload.referencePoNumber),
    referenceBastSjNumber: toNullable(payload.referenceBastSjNumber),
    customerReference: toNullable(payload.customerReference),
    salesPerson: toNullable(payload.salesPerson),
    taxId: toNullable(payload.taxId),
    paymentTerms: toNullable(payload.paymentTerms),
    deliveryNotes: toNullable(payload.deliveryNotes),
    billToName: toNullable(payload.billToName),
    billToAddress: toNullable(payload.billToAddress),
    deliveredToName: toNullable(payload.deliveredToName),
    deliveredToAddress: toNullable(payload.deliveredToAddress),
    fromName: toNullable(payload.fromName),
    fromAddress: toNullable(payload.fromAddress),
    toName: toNullable(payload.toName),
    toAddress: toNullable(payload.toAddress),
    notes,
    additionalNotes,
    lines: payload.lines.map((line, index) => ({
      sortOrder: index + 1,
      description: line.description,
      detail: toNullable(line.detail),
      quantity: line.quantity,
      unit: toNullable(line.unit),
      unitPrice: line.unitPrice,
    })),
  };
}

type DocumentInput = ReturnType<typeof buildDocumentInput>;

function parsePurchaseOrderPaymentExtras(
  formData: FormData,
  lineTotal: number,
) {
  const paymentTermType = z
    .enum(["LUMP_SUM", "TERMIN"])
    .parse(String(formData.get("paymentTermType") ?? "LUMP_SUM")) as PaymentTermType;
  const linkedPoMasukIds = parseLinkedIdsJson(String(formData.get("linkedPoMasukIds") ?? "[]"));
  let installments = parseInstallmentsJson(String(formData.get("installments") ?? "[]"));
  if (paymentTermType === "TERMIN") {
    validateInstallmentPercentages(installments);
    installments = computeInstallmentAmounts(lineTotal, installments);
  } else {
    installments = [];
  }
  return { paymentTermType, linkedPoMasukIds, installments };
}

async function applyPurchaseOrderGdrive(purchaseOrderId: string, formData: FormData) {
  const gdrive = parseGdriveLinkFormFields(formData);
  if (!gdrive) {
    return;
  }
  await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      gdriveFileId: gdrive.gdriveFileId,
      gdriveFileName: gdrive.gdriveFileName,
      gdriveWebViewLink: gdrive.gdriveWebViewLink,
    },
  });
}

async function persistPurchaseOrderPaymentExtras(
  purchaseOrderId: string,
  formData: FormData,
  lineTotal: number,
) {
  const extras = parsePurchaseOrderPaymentExtras(formData, lineTotal);
  await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { paymentTermType: extras.paymentTermType },
  });
  await replacePurchaseOrderInstallments(
    purchaseOrderId,
    extras.paymentTermType,
    extras.installments,
  );
  await replacePurchaseOrderLinks(purchaseOrderId, extras.linkedPoMasukIds);
}

async function createByType(input: DocumentInput, userId: string) {
  if (input.type === "INVOICE") {
    return prisma.invoice.create({
      data: {
        status: DocumentStatus.DRAFT,
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        referencePoNumber: input.referencePoNumber,
        referenceBastSjNumber: input.referenceBastSjNumber,
        customerReference: input.customerReference,
        salesPerson: input.salesPerson,
        taxId: input.taxId,
        paymentTerms: input.paymentTerms,
        billToName: input.billToName,
        billToAddress: input.billToAddress,
        deliveredToName: input.deliveredToName,
        deliveredToAddress: input.deliveredToAddress,
        withSignature: input.withSignature,
        createdById: userId,
        items: { create: input.lines },
      },
      select: { id: true },
    });
  }

  if (input.type === "PURCHASE_ORDER") {
    return prisma.purchaseOrder.create({
      data: {
        status: DocumentStatus.DRAFT,
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        taxId: input.taxId,
        paymentTerms: input.paymentTerms,
        deliveryNotes: input.deliveryNotes,
        orderToName: input.billToName,
        orderToAddress: input.billToAddress,
        deliveredToName: input.deliveredToName,
        deliveredToAddress: input.deliveredToAddress,
        withSignature: input.withSignature,
        createdById: userId,
        items: { create: input.lines },
      },
      select: { id: true },
    });
  }

  if (input.type === "SURAT_JALAN") {
    return prisma.suratJalan.create({
      data: {
        status: DocumentStatus.DRAFT,
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        referencePoNumber: input.referencePoNumber,
        fromName: input.fromName,
        fromAddress: input.fromAddress,
        toName: input.toName ?? input.deliveredToName,
        toAddress: input.toAddress ?? input.deliveredToAddress,
        deliveryNotes: input.deliveryNotes,
        withSignature: input.withSignature,
        createdById: userId,
        items: { create: input.lines },
      },
      select: { id: true },
    });
  }

  return prisma.sph.create({
    data: {
      status: DocumentStatus.DRAFT,
      locale: input.locale,
      documentNumber: input.documentNumber,
      issueDate: input.issueDate,
      subject: input.subject,
      recipientName: input.billToName,
      recipientCompany: input.deliveredToName,
      notes:
        input.notes.length > 0 || input.additionalNotes.length > 0
          ? {
              offerNotes: input.notes,
              additionalNotes: input.additionalNotes,
            }
          : Prisma.JsonNull,
      paymentTerms: input.paymentTerms,
      salesPerson: input.salesPerson,
      withSignature: input.withSignature,
      createdById: userId,
      items: { create: input.lines },
    },
    select: { id: true },
  });
}

export async function createDocument(formData: FormData) {
  const userId = await requireFileEditor();
  const input = buildDocumentInput(formData);

  const document = await createByType(input, userId);

  if (input.type === "PURCHASE_ORDER") {
    const lineTotal = sumLineItemsTotal(input.lines);
    await persistPurchaseOrderPaymentExtras(document.id, formData, lineTotal);
    await applyPurchaseOrderGdrive(document.id, formData);
  }

  revalidatePath(getDocumentListPath(input.type));
  revalidatePath("/admin/dashboard");
  redirect(getDocumentEditPath(input.type, document.id));
}

export async function updateDocument(documentId: string, formData: FormData) {
  await requireFileEditor();
  const input = buildDocumentInput(formData);

  if (input.type === "INVOICE") {
    const current = await prisma.invoice.findFirst({ where: { id: documentId, ...notDeleted } });
    if (!current) {
      throw new Error("Document not found or deleted");
    }
    await prisma.invoice.update({
      where: { id: documentId },
      data: {
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        referencePoNumber: input.referencePoNumber,
        referenceBastSjNumber: input.referenceBastSjNumber,
        customerReference: input.customerReference,
        salesPerson: input.salesPerson,
        taxId: input.taxId,
        paymentTerms: input.paymentTerms,
        billToName: input.billToName,
        billToAddress: input.billToAddress,
        deliveredToName: input.deliveredToName,
        deliveredToAddress: input.deliveredToAddress,
        withSignature: input.withSignature,
        items: { deleteMany: {}, create: input.lines },
      },
    });
  } else if (input.type === "PURCHASE_ORDER") {
    const current = await prisma.purchaseOrder.findFirst({ where: { id: documentId, ...notDeleted } });
    if (!current) {
      throw new Error("Document not found or deleted");
    }
    await prisma.purchaseOrder.update({
      where: { id: documentId },
      data: {
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        taxId: input.taxId,
        paymentTerms: input.paymentTerms,
        deliveryNotes: input.deliveryNotes,
        orderToName: input.billToName,
        orderToAddress: input.billToAddress,
        deliveredToName: input.deliveredToName,
        deliveredToAddress: input.deliveredToAddress,
        withSignature: input.withSignature,
        items: { deleteMany: {}, create: input.lines },
      },
    });
    const lineTotal = sumLineItemsTotal(input.lines);
    await persistPurchaseOrderPaymentExtras(documentId, formData, lineTotal);
    await applyPurchaseOrderGdrive(documentId, formData);
  } else if (input.type === "SURAT_JALAN") {
    const current = await prisma.suratJalan.findFirst({ where: { id: documentId, ...notDeleted } });
    if (!current) {
      throw new Error("Document not found or deleted");
    }
    await prisma.suratJalan.update({
      where: { id: documentId },
      data: {
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        referencePoNumber: input.referencePoNumber,
        fromName: input.fromName,
        fromAddress: input.fromAddress,
        toName: input.toName ?? input.deliveredToName,
        toAddress: input.toAddress ?? input.deliveredToAddress,
        deliveryNotes: input.deliveryNotes,
        withSignature: input.withSignature,
        items: { deleteMany: {}, create: input.lines },
      },
    });
  } else {
    const current = await prisma.sph.findFirst({ where: { id: documentId, ...notDeleted } });
    if (!current) {
      throw new Error("Document not found or deleted");
    }
    await prisma.sph.update({
      where: { id: documentId },
      data: {
        locale: input.locale,
        documentNumber: input.documentNumber,
        issueDate: input.issueDate,
        subject: input.subject,
        recipientName: input.billToName,
        recipientCompany: input.deliveredToName,
        notes:
          input.notes.length > 0 || input.additionalNotes.length > 0
            ? {
                offerNotes: input.notes,
                additionalNotes: input.additionalNotes,
              }
            : Prisma.JsonNull,
        paymentTerms: input.paymentTerms,
        salesPerson: input.salesPerson,
        withSignature: input.withSignature,
        items: { deleteMany: {}, create: input.lines },
      },
    });
  }

  revalidatePath(getDocumentListPath(input.type));
  revalidatePath(getDocumentPreviewPath(input.type, documentId));
  if (input.type === "PURCHASE_ORDER") {
    revalidatePath("/admin/dashboard");
  }
  redirect(`${getDocumentEditPath(input.type, documentId)}?updated=1`);
}

export async function finalizeDocument(type: DocumentType, id: string) {
  const userId = await requireFileEditor();

  if (type === "INVOICE") {
    const doc = await prisma.invoice.findFirstOrThrow({ where: { id, ...notDeleted } });
    const number =
      doc.documentNumber ??
      (await generateDocumentNumber(type, doc.issueDate, {
        clientName: doc.billToName ?? doc.deliveredToName,
      }));
    await prisma.invoice.update({ where: { id }, data: { status: DocumentStatus.FINAL, documentNumber: number, createdById: userId } });
  } else if (type === "PURCHASE_ORDER") {
    const doc = await prisma.purchaseOrder.findFirstOrThrow({ where: { id, ...notDeleted } });
    const number =
      doc.documentNumber ??
      (await generateDocumentNumber(type, doc.issueDate, {
        clientName: doc.orderToName ?? doc.deliveredToName,
      }));
    await prisma.purchaseOrder.update({ where: { id }, data: { status: DocumentStatus.FINAL, documentNumber: number, createdById: userId } });
  } else if (type === "SURAT_JALAN") {
    const doc = await prisma.suratJalan.findFirstOrThrow({ where: { id, ...notDeleted } });
    const number =
      doc.documentNumber ??
      (await generateDocumentNumber(type, doc.issueDate, {
        clientName: doc.toName,
      }));
    await prisma.suratJalan.update({ where: { id }, data: { status: DocumentStatus.FINAL, documentNumber: number, createdById: userId } });
  } else {
    const doc = await prisma.sph.findFirstOrThrow({ where: { id, ...notDeleted } });
    const number =
      doc.documentNumber ??
      (await generateDocumentNumber("SPH", doc.issueDate, {
        clientName: doc.recipientCompany ?? doc.recipientName,
      }));
    await prisma.sph.update({ where: { id }, data: { status: DocumentStatus.FINAL, documentNumber: number, createdById: userId } });
  }

  revalidatePath(getDocumentListPath(type));
  revalidatePath(getDocumentPreviewPath(type, id));
}

export async function deleteDocument(type: DocumentType, id: string) {
  await requireFileEditor();
  const now = new Date();

  if (type === "INVOICE") {
    const u = await prisma.invoice.updateMany({ where: { id, ...notDeleted }, data: { deletedAt: now } });
    if (u.count === 0) {
      throw new Error("Not found or already deleted");
    }
  } else if (type === "PURCHASE_ORDER") {
    const u = await prisma.purchaseOrder.updateMany({ where: { id, ...notDeleted }, data: { deletedAt: now } });
    if (u.count === 0) {
      throw new Error("Not found or already deleted");
    }
  } else if (type === "SURAT_JALAN") {
    const u = await prisma.suratJalan.updateMany({ where: { id, ...notDeleted }, data: { deletedAt: now } });
    if (u.count === 0) {
      throw new Error("Not found or already deleted");
    }
  } else {
    const u = await prisma.sph.updateMany({ where: { id, ...notDeleted }, data: { deletedAt: now } });
    if (u.count === 0) {
      throw new Error("Not found or already deleted");
    }
  }

  revalidatePath(getDocumentListPath(type));
}

export async function duplicateDocument(type: DocumentType, id: string) {
  const userId = await requireFileEditor();

  if (type === "INVOICE") {
    const source = await prisma.invoice.findFirstOrThrow({
      where: { id, ...notDeleted },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    const created = await prisma.invoice.create({
      data: {
        status: DocumentStatus.DRAFT,
        locale: source.locale,
        documentNumber: null,
        duplicatedFromNumber: source.documentNumber ?? "(Draft)",
        issueDate: source.issueDate,
        dueDate: source.dueDate,
        referencePoNumber: source.referencePoNumber,
        referenceBastSjNumber: source.referenceBastSjNumber,
        customerReference: source.customerReference,
        salesPerson: source.salesPerson,
        taxId: source.taxId,
        paymentTerms: source.paymentTerms,
        billToName: source.billToName,
        billToAddress: source.billToAddress,
        deliveredToName: source.deliveredToName,
        deliveredToAddress: source.deliveredToAddress,
        withSignature: source.withSignature,
        createdById: userId,
        items: {
          create: source.items.map((item) => ({
            sortOrder: item.sortOrder,
            description: item.description,
            detail: item.detail,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            currency: item.currency,
          })),
        },
      },
      select: { id: true },
    });
    revalidatePath(getDocumentListPath(type));
    redirect(getDocumentEditPath(type, created.id));
  }

  if (type === "PURCHASE_ORDER") {
    const source = await prisma.purchaseOrder.findFirstOrThrow({
      where: { id, ...notDeleted },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        installments: { orderBy: { sortOrder: "asc" } },
      },
    });
    const created = await prisma.purchaseOrder.create({
      data: {
        status: DocumentStatus.DRAFT,
        locale: source.locale,
        documentNumber: null,
        duplicatedFromNumber: source.documentNumber ?? "(Draft)",
        issueDate: source.issueDate,
        taxId: source.taxId,
        paymentTermType: source.paymentTermType,
        paymentTerms: source.paymentTerms,
        deliveryNotes: source.deliveryNotes,
        orderToName: source.orderToName,
        orderToAddress: source.orderToAddress,
        deliveredToName: source.deliveredToName,
        deliveredToAddress: source.deliveredToAddress,
        withSignature: source.withSignature,
        gdriveFileId: source.gdriveFileId,
        gdriveFileName: source.gdriveFileName,
        gdriveWebViewLink: source.gdriveWebViewLink,
        createdById: userId,
        items: {
          create: source.items.map((item) => ({
            sortOrder: item.sortOrder,
            description: item.description,
            detail: item.detail,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            currency: item.currency,
          })),
        },
      },
      select: { id: true },
    });
    await replacePurchaseOrderInstallments(
      created.id,
      source.paymentTermType,
      source.installments.map((row) => ({
        label: row.label ?? undefined,
        percentage: Number(row.percentage),
        amount: row.amount != null ? Number(row.amount) : undefined,
        dueDate: row.dueDate.toISOString().slice(0, 10),
        notes: row.notes ?? undefined,
      })),
    );
    revalidatePath(getDocumentListPath(type));
    redirect(getDocumentEditPath(type, created.id));
  }

  if (type === "SURAT_JALAN") {
    const source = await prisma.suratJalan.findFirstOrThrow({
      where: { id, ...notDeleted },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    const created = await prisma.suratJalan.create({
      data: {
        status: DocumentStatus.DRAFT,
        locale: source.locale,
        documentNumber: null,
        duplicatedFromNumber: source.documentNumber ?? "(Draft)",
        issueDate: source.issueDate,
        referencePoNumber: source.referencePoNumber,
        fromName: source.fromName,
        fromAddress: source.fromAddress,
        toName: source.toName,
        toAddress: source.toAddress,
        deliveryNotes: source.deliveryNotes,
        withSignature: source.withSignature,
        createdById: userId,
        items: {
          create: source.items.map((item) => ({
            sortOrder: item.sortOrder,
            description: item.description,
            detail: item.detail,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            currency: item.currency,
          })),
        },
      },
      select: { id: true },
    });
    revalidatePath(getDocumentListPath(type));
    redirect(getDocumentEditPath(type, created.id));
  }

  const source = await prisma.sph.findFirstOrThrow({
    where: { id, ...notDeleted },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  const created = await prisma.sph.create({
    data: {
      status: DocumentStatus.DRAFT,
      locale: source.locale,
      documentNumber: null,
      duplicatedFromNumber: source.documentNumber ?? "(Draft)",
      issueDate: source.issueDate,
      subject: source.subject,
      recipientName: source.recipientName,
      recipientCompany: source.recipientCompany,
      notes: source.notes ?? Prisma.JsonNull,
      paymentTerms: source.paymentTerms,
      salesPerson: source.salesPerson,
      withSignature: source.withSignature,
      createdById: userId,
      items: {
        create: source.items.map((item) => ({
          sortOrder: item.sortOrder,
          description: item.description,
          detail: item.detail,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          currency: item.currency,
        })),
      },
    },
    select: { id: true },
  });
  revalidatePath(getDocumentListPath(type));
  redirect(getDocumentEditPath(type, created.id));
}
