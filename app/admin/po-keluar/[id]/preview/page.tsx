import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { DocumentPreviewView } from "@/app/admin/documents/DocumentPreviewView";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { DocumentType } from "@/generated/prisma/client";
import { authOptions } from "@/lib/auth";
import { getDocumentEditPath } from "@/lib/document-paths";
import { buildDocumentPrintFileName } from "@/lib/print-file-name";
import { prisma } from "@/lib/prisma";
import { canWriteFiles } from "@/lib/role-guards";
import { notDeleted } from "@/lib/soft-delete";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>): Promise<Metadata> {
  const { id } = await params;
  const document = await prisma.purchaseOrder.findFirst({
    where: { id, ...notDeleted },
    select: { documentNumber: true },
  });
  return {
    title: buildDocumentPrintFileName(document?.documentNumber, DocumentType.PURCHASE_ORDER),
  };
}

export default async function PoKeluarPreviewPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const canWrite = canWriteFiles(session?.user?.role as string | undefined);

  const document = await prisma.purchaseOrder.findFirst({
    where: { id, ...notDeleted },
    select: { documentNumber: true },
  });

  if (!document) {
    notFound();
  }

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`PO Keluar Preview - ${document.documentNumber ?? "(Draft)"}`}
          actions={
            <>
              <Link
                href="/admin/po-keluar"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Back to list
              </Link>
              {canWrite && (
                <Link
                  href={getDocumentEditPath(DocumentType.PURCHASE_ORDER, id)}
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Edit
                </Link>
              )}
            </>
          }
        />
      </div>
      <DocumentPreviewView type={DocumentType.PURCHASE_ORDER} id={id} />
    </>
  );
}
