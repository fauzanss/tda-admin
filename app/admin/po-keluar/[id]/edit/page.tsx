import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { finalizeDocument, updateDocument } from "@/app/admin/documents/actions";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";
import {
  GdriveFilePreviewPanel,
  InstallmentsPanel,
  LinkedIncomingPoPanel,
} from "@/app/admin/po/PoPanels";
import { getPoKeluarFormData } from "@/app/admin/po-keluar/form-data";
import { DocumentType } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { getDocumentPreviewPath } from "@/lib/document-paths";
import { toInstallmentRows } from "@/lib/po-payment";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

const PO_KELUAR_TYPE = DocumentType.PURCHASE_ORDER;

export default async function EditPoKeluarPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string }>;
}>) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  if (!canWrite) {
    redirect("/admin/po-keluar");
  }

  const [{ companies, purchaseOrders, suratJalans, incomingPoOptions }, document] =
    await Promise.all([
      getPoKeluarFormData(),
      prisma.purchaseOrder.findFirst({
        where: { id, ...notDeleted },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          installments: { orderBy: { sortOrder: "asc" } },
          poMasukLinks: {
            include: {
              poMasuk: {
                select: { id: true, poNumber: true, distributorName: true },
              },
            },
          },
        },
      }),
    ]);

  if (!document) {
    notFound();
  }

  async function onSubmit(formData: FormData) {
    "use server";
    await updateDocument(document!.id, formData);
  }

  async function onFinalize() {
    "use server";
    await finalizeDocument(PO_KELUAR_TYPE, document!.id);
  }

  const installmentRows = toInstallmentRows(document.installments);
  const linkedIncoming = document.poMasukLinks.map((link) => link.poMasuk);

  const defaultValue = {
    locale: document.locale,
    duplicatedFromNumber: document.duplicatedFromNumber ?? null,
    withSignature: document.withSignature,
    issueDate: document.issueDate,
    dueDate: null,
    documentNumber: document.documentNumber ?? null,
    referencePoNumber: null,
    referenceBastSjNumber: null,
    customerReference: null,
    salesPerson: null,
    taxId: document.taxId ?? null,
    paymentTerms: document.paymentTerms ?? null,
    paymentTermType: document.paymentTermType,
    installments: installmentRows.map((row) => ({
      label: row.label ?? undefined,
      percentage: row.percentage,
      amount: row.amount ?? undefined,
      dueDate: row.dueDate.toISOString().slice(0, 10),
      notes: row.notes ?? undefined,
    })),
    linkedPoMasukIds: linkedIncoming.map((po) => po.id),
    gdriveWebViewLink: document.gdriveWebViewLink,
    gdriveFileName: document.gdriveFileName,
    deliveryNotes: document.deliveryNotes ?? null,
    billToName: document.orderToName ?? null,
    billToAddress: document.orderToAddress ?? null,
    deliveredToName: document.deliveredToName ?? null,
    deliveredToAddress: document.deliveredToAddress ?? null,
    fromName: null,
    fromAddress: null,
    toName: null,
    toAddress: null,
    subject: null,
    notes: null,
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
        <div className="alert alert-success py-2 mb-3" role="alert">
          Draft updated successfully.
        </div>
      )}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">
          Edit PO Keluar - {document.documentNumber ?? "(Draft)"}
        </h1>
        <div className="d-flex gap-2">
          <Link
            href={getDocumentPreviewPath(PO_KELUAR_TYPE, document.id)}
            className="btn btn-outline-secondary btn-sm"
          >
            Preview
          </Link>
          <form action={onFinalize}>
            <button className="btn btn-success btn-sm" type="submit">
              Finalize
            </button>
          </form>
        </div>
      </div>

      <LinkedIncomingPoPanel links={linkedIncoming} />
      <InstallmentsPanel installments={installmentRows} canWrite={canWrite} />

      {document.gdriveFileId && (
        <GdriveFilePreviewPanel
          fileId={document.gdriveFileId}
          fileName={document.gdriveFileName}
          webViewLink={document.gdriveWebViewLink}
        />
      )}

      <DocumentForm
        type={PO_KELUAR_TYPE}
        companies={companies}
        purchaseOrders={purchaseOrders}
        suratJalans={suratJalans}
        incomingPoOptions={incomingPoOptions}
        defaultValue={defaultValue}
        duplicateInfo={defaultValue.duplicatedFromNumber}
        onSubmit={onSubmit}
        submitLabel="Update Draft"
      />
    </main>
  );
}
