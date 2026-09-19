import Link from "next/link";
import { Eye, PenSquare, Printer } from "lucide-react";
import { redirect } from "next/navigation";

import { CompanyListFilter } from "@/app/admin/documents/CompanyListFilter";
import { DeleteDocumentButton } from "@/app/admin/documents/DeleteDocumentButton";
import { DuplicateDocumentButton } from "@/app/admin/documents/DuplicateDocumentButton";
import { SphDocumentList } from "@/app/admin/documents/SphDocumentList";
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
import { getBillingPhaseLabel } from "@/lib/billing-phase";
import { getDocumentEditPath, getDocumentNewPath, getDocumentPreviewPath } from "@/lib/document-paths";
import { destinationNameFilter, stringFieldInNames } from "@/lib/company-destination-filter";
import { LIST_PAGE_SIZE, paginateTakePlusOne } from "@/lib/list-pagination";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { formatAppDateTime, formatAppLongDate } from "@/lib/datetime";

function getCompanyName(
  type: "INVOICE" | "PERFORM_INVOICE" | "SURAT_JALAN" | "SPH",
  doc: {
    billToName?: string | null;
    orderToName?: string | null;
    toName?: string | null;
    recipientCompany?: string | null;
  },
) {
  if (type === "INVOICE" || type === "PERFORM_INVOICE") return doc.billToName ?? "-";
  if (type === "SURAT_JALAN") return doc.toName ?? "-";
  return doc.recipientCompany ?? "-";
}

export default async function DocumentListPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ type: string }>;
  searchParams?: Promise<{ company?: string }>;
}>) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  if (type === "PURCHASE_ORDER") {
    redirect("/admin/po-keluar");
  }
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);
  const selectedCompanyId = ((await searchParams)?.company ?? "").trim();
  const companies = await prisma.company.findMany({
    where: { ...notDeleted },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true, companyAlias: true, isActive: true },
  });
  const selectedCompany = companies.find((item) => item.id === selectedCompanyId) ?? null;
  const destinationNames = destinationNameFilter(selectedCompany);
  const nameFilter = stringFieldInNames(destinationNames);

  const header = (
    <PageHeader
      title={documentTypeLabels[type]}
      actions={
        <>
          <CompanyListFilter companies={companies} selectedId={selectedCompany?.id ?? ""} />
          {canWrite ? (
            <Link href={getDocumentNewPath(type)} className={cn(buttonVariants())}>
              + New Document
            </Link>
          ) : null}
        </>
      }
    />
  );

  if (type === "SPH") {
    const rows = await prisma.sph.findMany({
      where: {
        ...notDeleted,
        ...(nameFilter ? { recipientCompany: nameFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: LIST_PAGE_SIZE + 1,
      select: {
        id: true,
        documentNumber: true,
        recipientCompany: true,
        issueDate: true,
        updatedAt: true,
        status: true,
      },
    });
    const { items, hasMore } = paginateTakePlusOne(rows, LIST_PAGE_SIZE);

    return (
      <main>
        {header}
        <SphDocumentList
          key={selectedCompany?.id ?? "all"}
          initialDocuments={items}
          initialHasMore={hasMore}
          selectedCompanyId={selectedCompany?.id ?? ""}
          canWrite={canWrite}
        />
      </main>
    );
  }

  let documents;
  if (type === "INVOICE") {
    documents = await prisma.invoice.findMany({
      where: { ...notDeleted, ...(nameFilter ? { billToName: nameFilter } : {}) },
      orderBy: { createdAt: "desc" },
    });
  } else if (type === "PERFORM_INVOICE") {
    documents = await prisma.performInvoice.findMany({
      where: { ...notDeleted, ...(nameFilter ? { billToName: nameFilter } : {}) },
      orderBy: { createdAt: "desc" },
    });
  } else {
    documents = await prisma.suratJalan.findMany({
      where: { ...notDeleted, ...(nameFilter ? { toName: nameFilter } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  const showBillingPhase = type === "INVOICE" || type === "PERFORM_INVOICE";

  return (
    <main>
      {header}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Company Name</TableHead>
              {showBillingPhase && <TableHead>Billing</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={showBillingPhase ? 7 : 6} className="p-0">
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>{doc.documentNumber ?? "-"}</TableCell>
                <TableCell>{getCompanyName(type, doc)}</TableCell>
                {showBillingPhase && (
                  <TableCell>
                    {"billingPhase" in doc && doc.billingPhase !== "FULL" ? (
                      <Badge variant="orange">
                        {getBillingPhaseLabel(doc.billingPhase, doc.locale)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                )}
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
