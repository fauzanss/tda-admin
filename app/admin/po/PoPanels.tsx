import Link from "next/link";

import { MarkInstallmentPaidButton } from "@/app/admin/po/MarkInstallmentPaidButton";
import { formatCurrencyAmount } from "@/lib/documents";
import { getGoogleDrivePreviewUrl } from "@/lib/google-drive";
import type { InstallmentRow } from "@/lib/po-payment";

function formatDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function InstallmentsPanel({
  installments,
  canWrite,
}: Readonly<{
  installments: InstallmentRow[];
  canWrite: boolean;
}>) {
  if (installments.length === 0) {
    return null;
  }

  return (
    <section className="card mb-3">
      <div className="card-header fw-semibold">Payment Installments</div>
      <div className="table-responsive">
        <table className="table table-sm mb-0">
          <thead>
            <tr>
              <th>Label</th>
              <th>%</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              {canWrite && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {installments.map((row) => (
              <tr key={row.id}>
                <td>{row.label || "-"}</td>
                <td>{row.percentage}%</td>
                <td>{row.amount != null ? formatCurrencyAmount(row.amount) : "-"}</td>
                <td>{formatDate(row.dueDate)}</td>
                <td>
                  <span className={`badge ${row.paidAt ? "text-bg-success" : "text-bg-warning"}`}>
                    {row.paidAt ? "Paid" : "Pending"}
                  </span>
                </td>
                {canWrite && (
                  <td>{!row.paidAt && <MarkInstallmentPaidButton id={row.id} />}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function LinkedOutgoingPoPanel({
  links,
}: Readonly<{
  links: Array<{ id: string; documentNumber: string | null; orderToName: string | null }>;
}>) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className="card mb-3">
      <div className="card-header fw-semibold">Linked Outgoing PO</div>
      <ul className="list-group list-group-flush">
        {links.map((po) => (
          <li key={po.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{po.documentNumber ?? "(Draft)"} — {po.orderToName ?? "-"}</span>
            <div className="d-flex gap-2">
              <Link href={`/admin/po-keluar/${po.id}/edit`} className="btn btn-sm btn-outline-secondary">
                Edit
              </Link>
              <Link href={`/admin/po-keluar/${po.id}/preview`} className="btn btn-sm btn-outline-primary">
                Preview
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LinkedIncomingPoPanel({
  links,
}: Readonly<{
  links: Array<{ id: string; poNumber: string | null; distributorName: string }>;
}>) {
  if (links.length === 0) {
    return null;
  }

  return (
    <section className="card mb-3">
      <div className="card-header fw-semibold">Linked Incoming PO</div>
      <ul className="list-group list-group-flush">
        {links.map((po) => (
          <li key={po.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{po.poNumber ?? "-"} — {po.distributorName}</span>
            <Link href={`/admin/po-masuk/${po.id}`} className="btn btn-sm btn-outline-primary">
              View
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GdriveFilePreviewPanel({
  fileId,
  fileName,
  webViewLink,
}: Readonly<{
  fileId: string;
  fileName?: string | null;
  webViewLink?: string | null;
}>) {
  const viewUrl = webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`;
  const embedUrl = getGoogleDrivePreviewUrl(fileId);
  const title = fileName ?? "Google Drive File";

  return (
    <section className="card mb-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <span>PO File — {title}</span>
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
          title={title}
          className="w-100 border-0"
          style={{ minHeight: "70vh" }}
        />
      </div>
    </section>
  );
}
