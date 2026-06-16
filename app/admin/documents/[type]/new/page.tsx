import { DocumentType } from "@/generated/prisma/client";

import { createDocument } from "@/app/admin/documents/actions";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { documentTypeLabels } from "@/lib/document-meta";
import { authOptions } from "@/lib/auth";
import { canWriteFiles } from "@/lib/role-guards";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function NewDocumentPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  const session = await getServerSession(authOptions);
  if (!canWriteFiles(session?.user?.role as string | undefined)) {
    redirect(`/admin/documents/${type}`);
  }
  const companies = await prisma.company.findMany({
    where: { isActive: true, ...notDeleted },
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      companyAlias: true,
      address: true,
      isActive: true,
    },
  });
  const purchaseOrdersRaw = await prisma.purchaseOrder.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
      orderToName: true,
      orderToAddress: true,
      deliveredToName: true,
      deliveredToAddress: true,
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          description: true,
          detail: true,
          quantity: true,
          unit: true,
          unitPrice: true,
        },
      },
    },
  });
  const purchaseOrders = purchaseOrdersRaw.map((po) => ({
    ...po,
    items: po.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  }));
  const suratJalans = await prisma.suratJalan.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      documentNumber: true,
    },
  });

  async function onSubmit(formData: FormData) {
    "use server";
    await createDocument(formData);
  }

  return (
    <main>
      <h1 className="h3 fw-semibold mb-3">New Document - {documentTypeLabels[type as DocumentType]}</h1>
      <DocumentForm
        type={type}
        companies={companies}
        purchaseOrders={purchaseOrders}
        suratJalans={suratJalans}
        onSubmit={onSubmit}
        submitLabel="Save Draft"
      />
    </main>
  );
}
