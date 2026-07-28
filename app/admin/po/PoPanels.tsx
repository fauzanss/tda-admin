import Link from "next/link";

import { MarkInstallmentPaidButton } from "@/app/admin/po/MarkInstallmentPaidButton";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
import { getGoogleDrivePreviewUrl } from "@/lib/google-drive";
import { cn } from "@/lib/cn";
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
    <section className="mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Installments</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              {canWrite && <TableHead>Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.label || "-"}</TableCell>
                <TableCell>{row.percentage}%</TableCell>
                <TableCell>
                  {row.amount != null ? formatCurrencyAmount(row.amount) : "-"}
                </TableCell>
                <TableCell>{formatDate(row.dueDate)}</TableCell>
                <TableCell>
                  <Badge variant={row.paidAt ? "success" : "warning"}>
                    {row.paidAt ? "Paid" : "Pending"}
                  </Badge>
                </TableCell>
                {canWrite && (
                  <TableCell>
                    {!row.paidAt && <MarkInstallmentPaidButton id={row.id} />}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
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
    <section className="mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Linked Outgoing PO</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-slate-100">
          {links.map((po) => (
            <li
              key={po.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-slate-700">
                {po.documentNumber ?? "(Draft)"} — {po.orderToName ?? "-"}
              </span>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/po-keluar/${po.id}/edit`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Edit
                </Link>
                <Link
                  href={`/admin/po-keluar/${po.id}/preview`}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Preview
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
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
    <section className="mb-4">
      <Card>
        <CardHeader>
          <CardTitle>Linked Incoming PO</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-slate-100">
          {links.map((po) => (
            <li
              key={po.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-slate-700">
                {po.poNumber ?? "-"} — {po.distributorName}
              </span>
              <Link
                href={`/admin/po-masuk/${po.id}`}
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "shrink-0 self-start sm:self-auto",
                )}
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      </Card>
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
    <section className="mb-4">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="border-0 p-0">PO File — {title}</CardTitle>
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Buka di Google Drive
          </a>
        </CardHeader>
        <CardBody className="p-0">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full border-0"
            style={{ minHeight: "70vh" }}
          />
        </CardBody>
      </Card>
    </section>
  );
}
