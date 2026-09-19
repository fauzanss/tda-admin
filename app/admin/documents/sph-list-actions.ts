"use server";

import { destinationNameFilter, stringFieldInNames } from "@/lib/company-destination-filter";
import { LIST_PAGE_SIZE, paginateTakePlusOne } from "@/lib/list-pagination";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export type SphListItem = {
  id: string;
  documentNumber: string | null;
  recipientCompany: string | null;
  issueDate: Date;
  updatedAt: Date;
  status: "DRAFT" | "FINAL";
};

export async function loadMoreSphDocuments(input: {
  skip: number;
  companyId?: string;
}): Promise<{ items: SphListItem[]; hasMore: boolean }> {
  const skip = Math.max(0, input.skip || 0);
  const companyId = (input.companyId ?? "").trim();

  let nameFilter;
  if (companyId) {
    const company = await prisma.company.findFirst({
      where: { id: companyId, ...notDeleted },
      select: { id: true, companyName: true, companyAlias: true },
    });
    nameFilter = stringFieldInNames(destinationNameFilter(company));
  }

  const rows = await prisma.sph.findMany({
    where: {
      ...notDeleted,
      ...(nameFilter ? { recipientCompany: nameFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip,
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

  return paginateTakePlusOne(rows, LIST_PAGE_SIZE);
}
