import Link from "next/link";

import { DeleteDocumentButton } from "@/app/admin/documents/DeleteDocumentButton";
import { DuplicateDocumentButton } from "@/app/admin/documents/DuplicateDocumentButton";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { canWriteFiles } from "@/lib/role-guards";
import { documentTypeLabels } from "@/lib/document-meta";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

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

function getCompanyName(
  type: "INVOICE" | "PURCHASE_ORDER" | "SURAT_JALAN" | "SPH",
  doc: {
    billToName?: string | null;
    orderToName?: string | null;
    toName?: string | null;
    recipientCompany?: string | null;
  },
) {
  if (type === "INVOICE") return doc.billToName ?? "-";
  if (type === "PURCHASE_ORDER") return doc.orderToName ?? "-";
  if (type === "SURAT_JALAN") return doc.toName ?? "-";
  return doc.recipientCompany ?? "-";
}

export default async function DocumentListPage({
  params,
}: Readonly<{
  params: Promise<{ type: string }>;
}>) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  let documents;
  if (type === "INVOICE") {
    documents = await prisma.invoice.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  } else if (type === "PURCHASE_ORDER") {
    documents = await prisma.purchaseOrder.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  } else if (type === "SURAT_JALAN") {
    documents = await prisma.suratJalan.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  } else {
    documents = await prisma.sph.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  }

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">{documentTypeLabels[type]}</h1>
        {canWrite && (
          <Link href={`/admin/documents/${type}/new`} className="btn btn-primary">
            + New Document
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
                <td colSpan={6}>
                  No data available.
                </td>
              </tr>
            )}
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.documentNumber ?? "-"}</td>
                <td>{getCompanyName(type, doc)}</td>
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
                      href={`/admin/documents/${type}/${doc.id}/edit`}
                      className="btn btn-link p-0 me-3 text-decoration-none"
                      title="Edit"
                    >
                      <i className="bi bi-pencil-square" />
                    </Link>
                  )}
                  <Link
                    href={`/admin/documents/${type}/${doc.id}/preview`}
                    className="btn btn-link p-0 me-3 text-decoration-none"
                    title="Preview"
                  >
                    <i className="bi bi-eye" />
                  </Link>
                  {canWrite && <DuplicateDocumentButton type={type} id={doc.id} />}
                  {canWrite && <DeleteDocumentButton type={type} id={doc.id} />}
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
