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
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
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
      <PageHeader
        title="PO Masuk Detail"
        actions={
          <>
            <Link
              href="/admin/po-masuk"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Back to list
            </Link>
            {canWrite && <DeletePoMasukButton id={record.id} />}
          </>
        }
      />

      <Card className="mb-4">
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,1fr)_2fr]">
            <dt className="text-sm font-medium text-tda-navy-muted">Distributor</dt>
            <dd className="text-sm text-slate-700">{record.distributorName}</dd>
            <dt className="text-sm font-medium text-tda-navy-muted">PO Number</dt>
            <dd className="text-sm text-slate-700">{record.poNumber ?? "-"}</dd>
            <dt className="text-sm font-medium text-tda-navy-muted">Issue Date</dt>
            <dd className="text-sm text-slate-700">{formatLongDate(record.issueDate)}</dd>
            <dt className="text-sm font-medium text-tda-navy-muted">Payment Type</dt>
            <dd className="text-sm text-slate-700">
              <Badge
                variant={record.paymentTermType === "TERMIN" ? "orange" : "muted"}
              >
                {record.paymentTermType === "TERMIN" ? "Termin" : "Lump Sum"}
              </Badge>
            </dd>
            {record.totalAmount != null && (
              <>
                <dt className="text-sm font-medium text-tda-navy-muted">Total Amount</dt>
                <dd className="text-sm text-slate-700">
                  {Number(record.totalAmount).toLocaleString("id-ID")}
                </dd>
              </>
            )}
            {record.paymentTermType === "LUMP_SUM" && record.paymentTerms && (
              <>
                <dt className="text-sm font-medium text-tda-navy-muted">Payment Terms</dt>
                <dd className="text-sm text-slate-700">{record.paymentTerms}</dd>
              </>
            )}
            <dt className="text-sm font-medium text-tda-navy-muted">File</dt>
            <dd className="text-sm text-slate-700">
              <a
                href={viewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-tda-navy underline-offset-4 hover:underline"
              >
                {fileLabel}
              </a>
            </dd>
            <dt className="text-sm font-medium text-tda-navy-muted">Notes</dt>
            <dd className="text-sm text-slate-700">{record.notes ?? "-"}</dd>
          </dl>
        </CardBody>
      </Card>

      <LinkedOutgoingPoPanel links={linkedOutgoing} />
      <InstallmentsPanel installments={installmentRows} canWrite={canWrite} />

      <GdriveFilePreviewPanel
        fileId={record.gdriveFileId}
        fileName={record.gdriveFileName}
        webViewLink={record.gdriveWebViewLink}
      />

      {canWrite && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-tda-navy">Edit Metadata</h2>
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
