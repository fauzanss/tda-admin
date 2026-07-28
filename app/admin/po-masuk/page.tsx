import Link from "next/link";
import { Eye } from "lucide-react";

import { DeletePoMasukButton } from "@/app/admin/po-masuk/DeletePoMasukButton";
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
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

export default async function PoMasukListPage() {
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const records = await prisma.poMasuk.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { purchaseOrderLinks: true } },
    },
  });

  return (
    <main>
      <PageHeader
        title="PO Masuk"
        actions={
          canWrite ? (
            <Link
              href="/admin/po-masuk/new"
              className={buttonVariants({ variant: "default" })}
            >
              + New PO Masuk
            </Link>
          ) : undefined
        }
      />

      <Card>
        {records.length === 0 ? (
          <EmptyState title="No data available." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No PO</TableHead>
                <TableHead>Distributor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Linked</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>{record.poNumber ?? "-"}</TableCell>
                  <TableCell>{record.distributorName}</TableCell>
                  <TableCell>{formatAppLongDate(record.issueDate)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.paymentTermType === "TERMIN" ? "orange" : "muted"
                      }
                    >
                      {record.paymentTermType === "TERMIN" ? "Termin" : "Lump Sum"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record._count.purchaseOrderLinks > 0 ? (
                      <Badge>{record._count.purchaseOrderLinks}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{record.gdriveFileName ?? "Google Drive"}</TableCell>
                  <TableCell>{formatAppDateTime(record.updatedAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/po-masuk/${record.id}`}
                        title="View"
                        className={cn(
                          buttonVariants({ variant: "link", size: "icon" }),
                          "text-tda-navy",
                        )}
                      >
                        <Eye size={16} />
                      </Link>
                      {canWrite && <DeletePoMasukButton id={record.id} />}
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
