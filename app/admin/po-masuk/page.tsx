import Link from "next/link";

import { DeletePoMasukButton } from "@/app/admin/po-masuk/DeletePoMasukButton";
import { authOptions } from "@/lib/auth";
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

function formatDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default async function PoMasukListPage() {
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const records = await prisma.poMasuk.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">PO Masuk</h1>
        {canWrite && (
          <Link href="/admin/po-masuk/new" className="btn btn-primary">
            + New PO Masuk
          </Link>
        )}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>No PO</th>
                <th>Distributor</th>
                <th>Date</th>
                <th>File</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && (
                <tr>
                  <td colSpan={6}>No data available.</td>
                </tr>
              )}
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.poNumber ?? "-"}</td>
                  <td>{record.distributorName}</td>
                  <td>{formatLongDate(record.issueDate)}</td>
                  <td>{record.gdriveFileName}</td>
                  <td>{formatDateTime(record.updatedAt)}</td>
                  <td>
                    <Link
                      href={`/admin/po-masuk/${record.id}`}
                      className="btn btn-link p-0 me-3 text-decoration-none"
                      title="View"
                    >
                      <i className="bi bi-eye" />
                    </Link>
                    {canWrite && <DeletePoMasukButton id={record.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
