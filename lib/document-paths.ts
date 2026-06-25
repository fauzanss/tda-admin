import { DocumentType } from "@/generated/prisma/client";

export function getDocumentListPath(type: DocumentType) {
  if (type === "PURCHASE_ORDER") {
    return "/admin/po-keluar";
  }
  return `/admin/documents/${type}`;
}

export function getDocumentNewPath(type: DocumentType) {
  if (type === "PURCHASE_ORDER") {
    return "/admin/po-keluar/new";
  }
  return `/admin/documents/${type}/new`;
}

export function getDocumentEditPath(type: DocumentType, id: string) {
  if (type === "PURCHASE_ORDER") {
    return `/admin/po-keluar/${id}/edit`;
  }
  return `/admin/documents/${type}/${id}/edit`;
}

export function getDocumentPreviewPath(type: DocumentType, id: string) {
  if (type === "PURCHASE_ORDER") {
    return `/admin/po-keluar/${id}/preview`;
  }
  return `/admin/documents/${type}/${id}/preview`;
}
