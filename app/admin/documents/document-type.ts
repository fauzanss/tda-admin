import { DocumentType } from "@/generated/prisma/client";
import { notFound } from "next/navigation";

export function asDocumentType(value: string): DocumentType {
  if (Object.values(DocumentType).includes(value as DocumentType)) {
    return value as DocumentType;
  }
  return notFound();
}
