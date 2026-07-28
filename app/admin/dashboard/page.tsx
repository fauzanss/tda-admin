import Link from "next/link";

import { MarkInstallmentPaidButton } from "@/app/admin/po/MarkInstallmentPaidButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyAmount } from "@/lib/documents";
import { formatAppDate } from "@/lib/datetime";
import { getUpcomingInstallments } from "@/lib/po-payment";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { authOptions } from "@/lib/auth";
import { canWriteFiles } from "@/lib/role-guards";
import { getServerSession } from "next-auth";

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
      <PageHeader title="Dashboard" />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardBody>
            <p className="mb-1 text-sm text-tda-navy-muted">Draft Documents</p>
            <p className="text-4xl font-bold text-tda-navy">{draftCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="mb-1 text-sm text-tda-navy-muted">Final Documents</p>
            <p className="text-4xl font-bold text-tda-navy">{finalCount}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payment Due (30 days)</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Installment</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              {canWrite && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {upcoming.length === 0 && (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="p-0">
                  <EmptyState title="No upcoming payments in the next 30 days." />
                </TableCell>
              </TableRow>
            )}
            {upcoming.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={row.poHref}
                    className="font-medium text-tda-navy hover:underline"
                  >
                    {row.poLabel}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={row.kind === "INCOMING" ? "default" : "muted"}>
                    {row.kind === "INCOMING" ? "Masuk" : "Keluar"}
                  </Badge>
                </TableCell>
                <TableCell>{row.label ?? "-"}</TableCell>
                <TableCell>{row.percentage}%</TableCell>
                <TableCell>
                  {row.amount != null ? formatCurrencyAmount(row.amount) : "-"}
                </TableCell>
                <TableCell>{formatAppDate(row.dueDate)}</TableCell>
                {canWrite && (
                  <TableCell>
                    <MarkInstallmentPaidButton id={row.id} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </main>
  );
}
