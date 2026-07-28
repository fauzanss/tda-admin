import Link from "next/link";

import { SphCompanyChart } from "@/app/admin/dashboard/SphCompanyChart";
import { MarkInstallmentPaidButton } from "@/app/admin/po/MarkInstallmentPaidButton";
import { EmptyState } from "@/components/admin/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authOptions } from "@/lib/auth";
import { formatAppDate, getDefaultSphRangeYmd, shiftAppYmdMonths } from "@/lib/datetime";
import { formatCurrencyAmount } from "@/lib/documents";
import { getUpcomingInstallments } from "@/lib/po-payment";
import { canWriteFiles } from "@/lib/role-guards";
import {
  getSphCountByCompany,
  resolveSphDateRange,
} from "@/lib/sph-stats";
import { getServerSession } from "next-auth";

export default async function DashboardPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<{
    sphFrom?: string;
    sphTo?: string;
  }>;
}>) {
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const resolvedParams = (await searchParams) ?? {};
  const sphRange = resolveSphDateRange({
    from: resolvedParams.sphFrom,
    to: resolvedParams.sphTo,
  });
  const defaults = getDefaultSphRangeYmd();

  const [upcoming, sphByCompany] = await Promise.all([
    getUpcomingInstallments(30),
    getSphCountByCompany({
      fromDate: sphRange.fromDate,
      toDate: sphRange.toDate,
    }),
  ]);

  const sphTotal = sphByCompany.reduce((sum, row) => sum + row.count, 0);
  const preset1mFrom = shiftAppYmdMonths(defaults.to, -1);
  const preset6mFrom = shiftAppYmdMonths(defaults.to, -6);
  const preset12mFrom = shiftAppYmdMonths(defaults.to, -12);

  return (
    <main>
      <PageHeader title="Dashboard" />

      <Card className="mb-6">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>SPH by Company</CardTitle>
              <p className="mt-1 text-xs text-tda-navy-muted">
                Count based on issue date ({sphRange.from} – {sphRange.to}) · total{" "}
                {sphTotal}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/dashboard?sphFrom=${defaults.from}&sphTo=${defaults.to}`}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-tda-navy hover:bg-slate-50"
              >
                3 months
              </Link>
              <Link
                href={`/admin/dashboard?sphFrom=${preset1mFrom}&sphTo=${defaults.to}`}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-tda-navy hover:bg-slate-50"
              >
                1 month
              </Link>
              <Link
                href={`/admin/dashboard?sphFrom=${preset6mFrom}&sphTo=${defaults.to}`}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-tda-navy hover:bg-slate-50"
              >
                6 months
              </Link>
              <Link
                href={`/admin/dashboard?sphFrom=${preset12mFrom}&sphTo=${defaults.to}`}
                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-tda-navy hover:bg-slate-50"
              >
                12 months
              </Link>
            </div>
          </div>

          <form
            method="get"
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <div>
              <Label htmlFor="sphFrom">From</Label>
              <Input
                id="sphFrom"
                name="sphFrom"
                type="date"
                defaultValue={sphRange.from}
                required
              />
            </div>
            <div>
              <Label htmlFor="sphTo">To</Label>
              <Input
                id="sphTo"
                name="sphTo"
                type="date"
                defaultValue={sphRange.to}
                required
              />
            </div>
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              Apply
            </Button>
          </form>
        </CardHeader>
        <CardBody>
          <SphCompanyChart data={sphByCompany} />
        </CardBody>
      </Card>

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
