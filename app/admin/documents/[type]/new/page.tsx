import { DocumentType } from "@/generated/prisma/client";

import { createDocument } from "@/app/admin/documents/actions";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { PageHeader } from "@/components/admin/PageHeader";
import { defaultIdrPaymentTransfer, documentTypeLabels } from "@/lib/document-meta";
import { getDocumentListPath } from "@/lib/document-paths";
import { authOptions } from "@/lib/auth";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function NewDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams?: Promise<{ poMasukId?: string }>;
}) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  if (type === "PURCHASE_ORDER") {
    redirect("/admin/po-keluar/new");
  }
  const session = await getServerSession(authOptions);
  if (!canWriteFiles(session?.user?.role as string | undefined)) {
    redirect(getDocumentListPath(type));
  }
  const poMasukId = (await searchParams)?.poMasukId;
  const incomingPo =
    type === "PERFORM_INVOICE" && poMasukId
      ? await prisma.poMasuk.findFirst({ where: { id: poMasukId, ...notDeleted } })
      : null;
  const companies = await prisma.company.findMany({
    where: { isActive: true, ...notDeleted },
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      companyAlias: true,
      address: true,
      isActive: true,
    },
  });
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
      orderToName: true,
      orderToAddress: true,
      deliveredToName: true,
      deliveredToAddress: true,
    },
  });

  async function onSubmit(formData: FormData) {
    "use server";
    await createDocument(formData);
  }

  const defaultValue =
    incomingPo
      ? {
          locale: "ID" as const,
          duplicatedFromNumber: null,
          withSignature: true,
          issueDate: incomingPo.issueDate ?? new Date(),
          dueDate: null,
          documentNumber: null,
          referencePoNumber: incomingPo.poNumber ?? null,
          referenceBastSjNumber: null,
          customerReference: null,
          billingPhase: "TERMIN_90" as const,
          salesPerson: null,
          taxId: null,
          paymentTerms: defaultIdrPaymentTransfer,
          deliveryNotes: null,
          billToName: incomingPo.distributorName,
          billToAddress: null,
          deliveredToName: incomingPo.distributorName,
          deliveredToAddress: null,
          fromName: null,
          fromAddress: null,
          toName: null,
          toAddress: null,
          subject: null,
          notes: null,
          poMasukId: incomingPo.id,
          lines: [
            {
              description: `Perform Invoice${incomingPo.poNumber ? ` - ${incomingPo.poNumber}` : ""}`,
              detail: null,
              quantity: 1,
              unit: "Lot",
              unitPrice: incomingPo.totalAmount != null ? Number(incomingPo.totalAmount) : 0,
            },
          ],
        }
      : undefined;

  return (
    <main>
      <PageHeader title={`New Document - ${documentTypeLabels[type as DocumentType]}`} />
      <DocumentForm
        type={type}
        companies={companies}
        purchaseOrders={purchaseOrders}
        defaultValue={defaultValue}
        onSubmit={onSubmit}
        submitLabel={type === "SPH" || type === "PERFORM_INVOICE" || type === "INVOICE" ? "Save" : "Save Draft"}
      />
    </main>
  );
}
