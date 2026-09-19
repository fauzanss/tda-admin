"use client";

import Link from "next/link";
import { Eye, PenSquare, Printer } from "lucide-react";
import { useState } from "react";

import { DeleteDocumentButton } from "@/app/admin/documents/DeleteDocumentButton";
import { DuplicateDocumentButton } from "@/app/admin/documents/DuplicateDocumentButton";
import {
  loadMoreSphDocuments,
  type SphListItem,
} from "@/app/admin/documents/sph-list-actions";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatAppDateTime, formatAppLongDate } from "@/lib/datetime";
import { getDocumentEditPath, getDocumentPreviewPath } from "@/lib/document-paths";

export function SphDocumentList({
  initialDocuments,
  initialHasMore,
  selectedCompanyId,
  canWrite,
}: Readonly<{
  initialDocuments: SphListItem[];
  initialHasMore: boolean;
  selectedCompanyId: string;
  canWrite: boolean;
}>) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const result = await loadMoreSphDocuments({
        skip: documents.length,
        companyId: selectedCompanyId || undefined,
      });
      setDocuments((current) => [...current, ...result.items]);
      setHasMore(result.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
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
              <TableCell>{doc.recipientCompany ?? "-"}</TableCell>
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
                      href={getDocumentEditPath("SPH", doc.id)}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                      title="Edit"
                      aria-label="Edit document"
                    >
                      <PenSquare size={16} />
                    </Link>
                  )}
                  <Link
                    href={getDocumentPreviewPath("SPH", doc.id)}
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                    title="Preview"
                    aria-label="Preview document"
                  >
                    <Eye size={16} />
                  </Link>
                  <Link
                    href={`${getDocumentPreviewPath("SPH", doc.id)}?print=1`}
                    className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                    title="Print"
                    aria-label="Print document"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Printer size={16} />
                  </Link>
                  {canWrite && <DuplicateDocumentButton type="SPH" id={doc.id} />}
                  {canWrite && <DeleteDocumentButton type="SPH" id={doc.id} />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMore && (
        <div className="flex justify-center border-t border-slate-100 px-4 py-3">
          <Button type="button" variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Spinner size={16} className="text-current" />
                Loading...
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
