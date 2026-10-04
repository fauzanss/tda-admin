import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentPreviewView } from "@/app/admin/documents/DocumentPreviewView";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { buildDocumentPrintFileName } from "@/lib/print-file-name";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

async function loadPreviewDocumentNumber(type: ReturnType<typeof asDocumentType>, id: string) {
  switch (type) {
    case "INVOICE":
      return (await prisma.invoice.findFirst({ where: { id, ...notDeleted }, select: { documentNumber: true } }))
        ?.documentNumber;
    case "PERFORM_INVOICE":
      return (
        await prisma.performInvoice.findFirst({
          where: { id, ...notDeleted },
          select: { documentNumber: true },
        })
      )?.documentNumber;
    case "SURAT_JALAN":
      return (
        await prisma.suratJalan.findFirst({
          where: { id, ...notDeleted },
          select: { documentNumber: true },
        })
      )?.documentNumber;
    case "SPH":
      return (await prisma.sph.findFirst({ where: { id, ...notDeleted }, select: { documentNumber: true } }))
        ?.documentNumber;
    case "PURCHASE_ORDER":
      return (
        await prisma.purchaseOrder.findFirst({
          where: { id, ...notDeleted },
          select: { documentNumber: true },
        })
      )?.documentNumber;
    default:
      return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  if (type === "PURCHASE_ORDER") {
    return { title: "Outgoing PO" };
  }
  const documentNumber = await loadPreviewDocumentNumber(type, resolved.id);
  return {
    title: buildDocumentPrintFileName(documentNumber, type),
  };
}

export default async function PreviewDocumentPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  if (type === "PURCHASE_ORDER") {
    redirect(`/admin/po-keluar/${resolved.id}/preview`);
  }

  return <DocumentPreviewView type={type} id={resolved.id} />;
}
