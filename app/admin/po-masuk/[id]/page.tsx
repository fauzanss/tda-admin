import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePoMasuk } from "@/app/admin/po-masuk/actions";
import { DeletePoMasukButton } from "@/app/admin/po-masuk/DeletePoMasukButton";
import { PoMasukForm } from "@/app/admin/po-masuk/PoMasukForm";
import { authOptions } from "@/lib/auth";
import { getPoMasukFileViewUrl } from "@/lib/google-drive";
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
  const record = await prisma.poMasuk.findFirst({
    where: { id, ...notDeleted },
  });

  if (!record) {
    notFound();
  }

  const viewUrl = record.gdriveWebViewLink ?? getPoMasukFileViewUrl(record.gdriveFileId);
  const embedUrl = getPoMasukFileViewUrl(record.gdriveFileId);

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
            <dt className="col-sm-3">File</dt>
            <dd className="col-sm-9">
              <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                {record.gdriveFileName}
              </a>
            </dd>
            <dt className="col-sm-3">Notes</dt>
            <dd className="col-sm-9">{record.notes ?? "-"}</dd>
          </dl>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header d-flex align-items-center justify-content-between">
          <span>File Preview</span>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-primary btn-sm"
          >
            Buka di Google Drive
          </a>
        </div>
        <div className="card-body p-0">
          <iframe
            src={embedUrl}
            title={record.gdriveFileName}
            className="w-100 border-0"
            style={{ minHeight: "70vh" }}
          />
        </div>
      </div>

      {canWrite && (
        <>
          <h2 className="h5 fw-semibold mb-3">Edit Metadata</h2>
          <PoMasukForm
            action={updatePoMasuk}
            submitLabel="Save Changes"
            initial={{
              id: record.id,
              poNumber: record.poNumber,
              issueDate: record.issueDate,
              distributorName: record.distributorName,
              notes: record.notes,
            }}
          />
        </>
      )}
    </main>
  );
}
