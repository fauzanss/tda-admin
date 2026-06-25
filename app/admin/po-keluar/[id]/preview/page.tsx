import { DocumentPreviewView } from "@/app/admin/documents/DocumentPreviewView";
import { DocumentType } from "@/generated/prisma/client";

export default async function PoKeluarPreviewPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;
  return <DocumentPreviewView type={DocumentType.PURCHASE_ORDER} id={id} />;
}
