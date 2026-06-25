import Link from "next/link";

import { DeleteDocumentButton } from "@/app/admin/documents/DeleteDocumentButton";
import { DuplicateDocumentButton } from "@/app/admin/documents/DuplicateDocumentButton";
import { authOptions } from "@/lib/auth";
import { getDocumentEditPath, getDocumentPreviewPath } from "@/lib/document-paths";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

const PO_KELUAR_TYPE = "PURCHASE_ORDER" as const;

function formatLongDate(date: Date) {
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

export default async function PoKeluarListPage() {
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const documents = await prisma.purchaseOrder.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">PO Keluar</h1>
        {canWrite && (
          <Link href="/admin/po-keluar/new" className="btn btn-primary">
            + New PO Keluar
          </Link>
        )}
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-striped mb-0">
            <thead>
              <tr>
                <th>No</th>
                <th>Company Name</th>
                <th>Date</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 && (
                <tr>
                  <td colSpan={6}>No data available.</td>
                </tr>
              )}
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.documentNumber ?? "-"}</td>
                  <td>{doc.orderToName ?? "-"}</td>
                  <td>{formatLongDate(doc.issueDate)}</td>
                  <td>{formatDateTime(doc.updatedAt)}</td>
                  <td>
                    <span className={`badge ${doc.status === "FINAL" ? "text-bg-success" : "text-bg-secondary"}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td>
                    {canWrite && (
                      <Link
                        href={getDocumentEditPath(PO_KELUAR_TYPE, doc.id)}
                        className="btn btn-link p-0 me-3 text-decoration-none"
                        title="Edit"
                      >
                        <i className="bi bi-pencil-square" />
                      </Link>
                    )}
                    <Link
                      href={getDocumentPreviewPath(PO_KELUAR_TYPE, doc.id)}
                      className="btn btn-link p-0 me-3 text-decoration-none"
                      title="Preview"
                    >
                      <i className="bi bi-eye" />
                    </Link>
                    {canWrite && <DuplicateDocumentButton type={PO_KELUAR_TYPE} id={doc.id} />}
                    {canWrite && <DeleteDocumentButton type={PO_KELUAR_TYPE} id={doc.id} />}
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
