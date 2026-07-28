import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import { DeleteDocumentButton } from "@/app/admin/documents/DeleteDocumentButton";
import { DuplicateDocumentButton } from "@/app/admin/documents/DuplicateDocumentButton";
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
import { authOptions } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatAppDateTime, formatAppLongDate } from "@/lib/datetime";
import { getDocumentEditPath, getDocumentPreviewPath } from "@/lib/document-paths";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

const PO_KELUAR_TYPE = "PURCHASE_ORDER" as const;

export default async function PoKeluarListPage() {
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const documents = await prisma.purchaseOrder.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { poMasukLinks: true } },
    },
  });

  return (
    <main>
      <PageHeader
        title="PO Keluar"
        actions={
          canWrite ? (
            <Link
              href="/admin/po-keluar/new"
              className={buttonVariants({ variant: "default" })}
            >
              + New PO Keluar
            </Link>
          ) : undefined
        }
      />

      <Card>
        {documents.length === 0 ? (
          <EmptyState title="No data available." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{doc.documentNumber ?? "-"}</TableCell>
                  <TableCell>{doc.orderToName ?? "-"}</TableCell>
                  <TableCell>{formatAppLongDate(doc.issueDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={doc.paymentTermType === "TERMIN" ? "orange" : "muted"}
                    >
                      {doc.paymentTermType === "TERMIN" ? "Termin" : "Lump Sum"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {doc._count.poMasukLinks > 0 ? (
                      <Badge>{doc._count.poMasukLinks}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatAppDateTime(doc.updatedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "FINAL" ? "success" : "muted"}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canWrite && (
                        <Link
                          href={getDocumentEditPath(PO_KELUAR_TYPE, doc.id)}
                          title="Edit"
                          className={cn(
                            buttonVariants({ variant: "link", size: "icon" }),
                            "text-tda-navy",
                          )}
                        >
                          <Pencil size={16} />
                        </Link>
                      )}
                      <Link
                        href={getDocumentPreviewPath(PO_KELUAR_TYPE, doc.id)}
                        title="Preview"
                        className={cn(
                          buttonVariants({ variant: "link", size: "icon" }),
                          "text-tda-navy",
                        )}
                      >
                        <Eye size={16} />
                      </Link>
                      {canWrite && (
                        <DuplicateDocumentButton type={PO_KELUAR_TYPE} id={doc.id} />
                      )}
                      {canWrite && (
                        <DeleteDocumentButton type={PO_KELUAR_TYPE} id={doc.id} />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </main>
  );
}
