import Link from "next/link";

import { finalizeDocument, updateDocument } from "@/app/admin/documents/actions";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { PageHeader } from "@/components/admin/PageHeader";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { documentTypeLabels } from "@/lib/document-meta";
import { getDocumentListPath, getDocumentPreviewPath } from "@/lib/document-paths";
import { authOptions } from "@/lib/auth";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function EditDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams?: Promise<{ updated?: string }>;
}) {
  const resolved = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const type = asDocumentType(resolved.type);
  if (type === "PURCHASE_ORDER") {
    redirect(`/admin/po-keluar/${resolved.id}/edit`);
  }
  const session = await getServerSession(authOptions);
  if (!canWriteFiles(session?.user?.role as string | undefined)) {
    redirect(getDocumentListPath(type));
  }
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
  const purchaseOrdersRaw = await prisma.purchaseOrder.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
      orderToName: true,
      orderToAddress: true,
      deliveredToName: true,
      deliveredToAddress: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          description: true,
          detail: true,
          quantity: true,
          unit: true,
          unitPrice: true,
        },
      },
    },
  });
  const purchaseOrders = purchaseOrdersRaw.map((po) => ({
    ...po,
    items: po.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  }));
  const suratJalans = await prisma.suratJalan.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
    },
  });
  const document =
    type === "INVOICE"
      ? await prisma.invoice.findFirstOrThrow({
          where: { id: resolved.id, ...notDeleted },
          include: { items: { orderBy: { sortOrder: "asc" } } },
        })
      : type === "SURAT_JALAN"
        ? await prisma.suratJalan.findFirstOrThrow({
            where: { id: resolved.id, ...notDeleted },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          })
        : await prisma.sph.findFirstOrThrow({
            where: { id: resolved.id, ...notDeleted },
            include: { items: { orderBy: { sortOrder: "asc" } } },
          });

  async function onSubmit(formData: FormData) {
    "use server";
    await updateDocument(document.id, formData);
  }

  async function onFinalize() {
    "use server";
    await finalizeDocument(type, document.id);
  }

  const defaultValue = {
    locale: document.locale,
    duplicatedFromNumber:
      "duplicatedFromNumber" in document ? document.duplicatedFromNumber ?? null : null,
    withSignature: "withSignature" in document ? document.withSignature : true,
    issueDate: document.issueDate,
    dueDate: "dueDate" in document ? document.dueDate ?? null : null,
    documentNumber: document.documentNumber ?? null,
    referencePoNumber: "referencePoNumber" in document ? document.referencePoNumber ?? null : null,
    referenceBastSjNumber:
      "referenceBastSjNumber" in document ? document.referenceBastSjNumber ?? null : null,
    customerReference: "customerReference" in document ? document.customerReference ?? null : null,
    salesPerson: "salesPerson" in document ? document.salesPerson ?? null : null,
    taxId: "taxId" in document ? document.taxId ?? null : null,
    paymentTerms: "paymentTerms" in document ? document.paymentTerms ?? null : null,
    offerKind: "offerKind" in document ? document.offerKind : undefined,
    deliveryNotes: "deliveryNotes" in document ? document.deliveryNotes ?? null : null,
    billToName:
      "billToName" in document
        ? document.billToName ?? null
        : "recipientName" in document
          ? document.recipientName ?? null
          : null,
    billToAddress:
      "billToAddress" in document ? document.billToAddress ?? null : null,
    deliveredToName:
      "deliveredToName" in document
        ? document.deliveredToName ?? null
        : "recipientCompany" in document
          ? document.recipientCompany ?? null
          : null,
    deliveredToAddress: "deliveredToAddress" in document ? document.deliveredToAddress ?? null : null,
    fromName: "fromName" in document ? document.fromName ?? null : null,
    fromAddress: "fromAddress" in document ? document.fromAddress ?? null : null,
    toName: "toName" in document ? document.toName ?? null : null,
    toAddress: "toAddress" in document ? document.toAddress ?? null : null,
    subject: "subject" in document ? document.subject ?? null : null,
    notes: "notes" in document ? document.notes : null,
    lines: document.items.map((line) => ({
      description: line.description,
      detail: line.detail ?? null,
      quantity: Number(line.quantity),
      unit: line.unit ?? null,
      unitPrice: Number(line.unitPrice),
    })),
  };

  return (
    <main>
      {resolvedSearchParams.updated === "1" && (
        <Alert variant="success" className="mb-4">
          {type === "SPH" ? "Quotation updated successfully." : "Draft updated successfully."}
        </Alert>
      )}
      <PageHeader
        title={`Edit ${documentTypeLabels[type]} - ${document.documentNumber ?? "(Draft)"}`}
        actions={
          <>
            <Link
              href={getDocumentPreviewPath(type, document.id)}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Preview
            </Link>
            {type !== "SPH" && (
              <form action={onFinalize}>
                <SubmitButton variant="secondary" size="sm" pendingLabel="Finalizing...">
                  Finalize
                </SubmitButton>
              </form>
            )}
          </>
        }
      />
      <DocumentForm
        type={type}
        companies={companies}
        purchaseOrders={purchaseOrders}
        suratJalans={suratJalans}
        defaultValue={defaultValue}
        duplicateInfo={defaultValue.duplicatedFromNumber}
        onSubmit={onSubmit}
        submitLabel={type === "SPH" ? "Save" : "Update Draft"}
      />
    </main>
  );
}
