import Link from "next/link";

import { MarkInstallmentPaidButton } from "@/app/admin/po/MarkInstallmentPaidButton";
import { formatCurrencyAmount } from "@/lib/documents";
import { getUpcomingInstallments } from "@/lib/po-payment";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { authOptions } from "@/lib/auth";
import { canWriteFiles } from "@/lib/role-guards";
import { getServerSession } from "next-auth";

function formatDueDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);

  const [draftCount, finalCount, upcoming] = await Promise.all([
    Promise.all([
      prisma.invoice.count({ where: { status: "DRAFT", ...notDeleted } }),
      prisma.purchaseOrder.count({ where: { status: "DRAFT", ...notDeleted } }),
      prisma.suratJalan.count({ where: { status: "DRAFT", ...notDeleted } }),
      prisma.sph.count({ where: { status: "DRAFT", ...notDeleted } }),
    ]).then((counts) => counts.reduce((sum, item) => sum + item, 0)),
    Promise.all([
      prisma.invoice.count({ where: { status: "FINAL", ...notDeleted } }),
      prisma.purchaseOrder.count({ where: { status: "FINAL", ...notDeleted } }),
      prisma.suratJalan.count({ where: { status: "FINAL", ...notDeleted } }),
      prisma.sph.count({ where: { status: "FINAL", ...notDeleted } }),
    ]).then((counts) => counts.reduce((sum, item) => sum + item, 0)),
    getUpcomingInstallments(30),
  ]);

  return (
    <main>
      <h1 className="h3 fw-semibold mb-3">Dashboard</h1>
      <div className="row g-3 mb-3">
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <p className="text-muted mb-1">Draft Documents</p>
              <p className="display-6 fw-bold mb-0">{draftCount}</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <p className="text-muted mb-1">Final Documents</p>
              <p className="display-6 fw-bold mb-0">{finalCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-semibold">Upcoming Payment Due (30 days)</div>
        <div className="table-responsive">
          <table className="table table-sm mb-0">
            <thead>
              <tr>
                <th>PO</th>
                <th>Type</th>
                <th>Installment</th>
                <th>%</th>
                <th>Amount</th>
                <th>Due Date</th>
                {canWrite && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={canWrite ? 7 : 6} className="text-muted">
                    No upcoming payments in the next 30 days.
                  </td>
                </tr>
              )}
              {upcoming.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={row.poHref}>{row.poLabel}</Link>
                  </td>
                  <td>
                    <span className={`badge ${row.kind === "INCOMING" ? "text-bg-primary" : "text-bg-secondary"}`}>
                      {row.kind === "INCOMING" ? "Masuk" : "Keluar"}
                    </span>
                  </td>
                  <td>{row.label ?? "-"}</td>
                  <td>{row.percentage}%</td>
                  <td>{row.amount != null ? formatCurrencyAmount(row.amount) : "-"}</td>
                  <td>{formatDueDate(row.dueDate)}</td>
                  {canWrite && (
                    <td>
                      <MarkInstallmentPaidButton id={row.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
