import Link from "next/link";
import { Eye, PenSquare, Printer } from "lucide-react";
import { redirect } from "next/navigation";

import { DeleteDocumentButton } from "@/app/admin/documents/DeleteDocumentButton";
import { DuplicateDocumentButton } from "@/app/admin/documents/DuplicateDocumentButton";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { canWriteFiles } from "@/lib/role-guards";
import { documentTypeLabels } from "@/lib/document-meta";
import { getDocumentEditPath, getDocumentNewPath, getDocumentPreviewPath } from "@/lib/document-paths";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatAppDateTime, formatAppLongDate } from "@/lib/datetime";

function getCompanyName(
  type: "INVOICE" | "SURAT_JALAN" | "SPH",
  doc: {
    billToName?: string | null;
    orderToName?: string | null;
    toName?: string | null;
    recipientCompany?: string | null;
  },
) {
  if (type === "INVOICE") return doc.billToName ?? "-";
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
  if (type === "PURCHASE_ORDER") {
    redirect("/admin/po-keluar");
  }
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  let documents;
  if (type === "INVOICE") {
    documents = await prisma.invoice.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  } else if (type === "SURAT_JALAN") {
    documents = await prisma.suratJalan.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  } else {
    documents = await prisma.sph.findMany({ where: { ...notDeleted }, orderBy: { createdAt: "desc" } });
  }

  return (
    <main>
      <PageHeader
        title={documentTypeLabels[type]}
        actions={
          canWrite ? (
            <Link href={getDocumentNewPath(type)} className={cn(buttonVariants())}>
              + New Document
            </Link>
          ) : undefined
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.documentNumber ?? "-"}</TableCell>
                <TableCell>{getCompanyName(type, doc)}</TableCell>
                <TableCell>{formatAppLongDate(doc.issueDate)}</TableCell>
                <TableCell>{formatAppDateTime(doc.updatedAt)}</TableCell>
                <TableCell>
                  <Badge variant={doc.status === "FINAL" ? "success" : "muted"}>
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    {canWrite && (
                      <Link
                        href={getDocumentEditPath(type, doc.id)}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        title="Edit"
                        aria-label="Edit document"
                      >
                        <PenSquare size={16} />
                      </Link>
                    )}
                    <Link
                      href={getDocumentPreviewPath(type, doc.id)}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      title="Preview"
                      aria-label="Preview document"
                    >
                      <Eye size={16} />
                    </Link>
                    <Link
                      href={`${getDocumentPreviewPath(type, doc.id)}?print=1`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      title="Print"
                      aria-label="Print document"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Printer size={16} />
                    </Link>
                    {canWrite && <DuplicateDocumentButton type={type} id={doc.id} />}
                    {canWrite && <DeleteDocumentButton type={type} id={doc.id} />}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}
