import { DocumentPreviewView } from "@/app/admin/documents/DocumentPreviewView";
import { asDocumentType } from "@/app/admin/documents/document-type";
import { redirect } from "next/navigation";

export default async function PreviewDocumentPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const resolved = await params;
  const type = asDocumentType(resolved.type);
  if (type === "PURCHASE_ORDER") {
    redirect(`/admin/po-keluar/${resolved.id}/preview`);
  }

  return <DocumentPreviewView type={type} id={resolved.id} />;
}
