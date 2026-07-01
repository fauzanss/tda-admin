import Link from "next/link";
import { notFound } from "next/navigation";

import {
  GdriveFilePreviewPanel,
  InstallmentsPanel,
  LinkedOutgoingPoPanel,
} from "@/app/admin/po/PoPanels";
import { updatePoMasuk } from "@/app/admin/po-masuk/actions";
import { DeletePoMasukButton } from "@/app/admin/po-masuk/DeletePoMasukButton";
import { PoMasukForm } from "@/app/admin/po-masuk/PoMasukForm";
import { authOptions } from "@/lib/auth";
import {
  listOutgoingPoOptions,
  toInstallmentRows,
} from "@/lib/po-payment";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

function formatLongDate(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PoMasukDetailPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const [record, outgoingPoOptions] = await Promise.all([
    prisma.poMasuk.findFirst({
      where: { id, ...notDeleted },
      include: {
        installments: { orderBy: { sortOrder: "asc" } },
        purchaseOrderLinks: {
          include: {
            purchaseOrder: {
              select: { id: true, documentNumber: true, orderToName: true },
            },
          },
        },
      },
    }),
    listOutgoingPoOptions(),
  ]);

  if (!record) {
    notFound();
  }

  const viewUrl = record.gdriveWebViewLink ?? `https://drive.google.com/file/d/${record.gdriveFileId}/view`;
  const fileLabel = record.gdriveFileName ?? "Google Drive File";
  const installmentRows = toInstallmentRows(record.installments);
  const linkedOutgoing = record.purchaseOrderLinks.map((link) => link.purchaseOrder);
  const outgoingOptions = outgoingPoOptions.map((po) => ({
    id: po.id,
    label: `${po.documentNumber ?? "(Draft)"} — ${po.orderToName ?? "-"}`,
  }));

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">PO Masuk Detail</h1>
        <div className="d-flex gap-2">
          <Link href="/admin/po-masuk" className="btn btn-outline-secondary btn-sm">
            Back to list
          </Link>
          {canWrite && <DeletePoMasukButton id={record.id} />}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-sm-3">Distributor</dt>
            <dd className="col-sm-9">{record.distributorName}</dd>
            <dt className="col-sm-3">PO Number</dt>
            <dd className="col-sm-9">{record.poNumber ?? "-"}</dd>
            <dt className="col-sm-3">Issue Date</dt>
            <dd className="col-sm-9">{formatLongDate(record.issueDate)}</dd>
            <dt className="col-sm-3">Payment Type</dt>
            <dd className="col-sm-9">
              <span className={`badge ${record.paymentTermType === "TERMIN" ? "text-bg-info" : "text-bg-secondary"}`}>
                {record.paymentTermType === "TERMIN" ? "Termin" : "Lump Sum"}
              </span>
            </dd>
            {record.totalAmount != null && (
              <>
                <dt className="col-sm-3">Total Amount</dt>
                <dd className="col-sm-9">{Number(record.totalAmount).toLocaleString("id-ID")}</dd>
              </>
            )}
            {record.paymentTermType === "LUMP_SUM" && record.paymentTerms && (
              <>
                <dt className="col-sm-3">Payment Terms</dt>
                <dd className="col-sm-9">{record.paymentTerms}</dd>
              </>
            )}
            <dt className="col-sm-3">File</dt>
            <dd className="col-sm-9">
              <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                {fileLabel}
              </a>
            </dd>
            <dt className="col-sm-3">Notes</dt>
            <dd className="col-sm-9">{record.notes ?? "-"}</dd>
          </dl>
        </div>
      </div>

      <LinkedOutgoingPoPanel links={linkedOutgoing} />
      <InstallmentsPanel installments={installmentRows} canWrite={canWrite} />

      <GdriveFilePreviewPanel
        fileId={record.gdriveFileId}
        fileName={record.gdriveFileName}
        webViewLink={record.gdriveWebViewLink}
      />

      {canWrite && (
        <>
          <h2 className="h5 fw-semibold mb-3">Edit Metadata</h2>
          <PoMasukForm
            action={updatePoMasuk}
            submitLabel="Save Changes"
            outgoingPoOptions={outgoingOptions}
            initial={{
              id: record.id,
              poNumber: record.poNumber,
              issueDate: record.issueDate,
              distributorName: record.distributorName,
              notes: record.notes,
              paymentTermType: record.paymentTermType,
              paymentTerms: record.paymentTerms,
              totalAmount: record.totalAmount ? Number(record.totalAmount) : null,
              installments: installmentRows.map((row) => ({
                label: row.label ?? undefined,
                percentage: row.percentage,
                amount: row.amount ?? undefined,
                dueDate: row.dueDate.toISOString().slice(0, 10),
                notes: row.notes ?? undefined,
              })),
              linkedPurchaseOrderIds: linkedOutgoing.map((po) => po.id),
              gdriveWebViewLink: record.gdriveWebViewLink,
              gdriveFileName: record.gdriveFileName,
            }}
          />
        </>
      )}
    </main>
  );
}
