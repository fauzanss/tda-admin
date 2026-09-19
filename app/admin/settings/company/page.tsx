import { CompanyClient } from "@/app/admin/settings/company/CompanyClient";
import { LIST_PAGE_SIZE, paginateTakePlusOne } from "@/lib/list-pagination";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export default async function CompanySettingsPage() {
  const rows = await prisma.company.findMany({
    where: { ...notDeleted },
    orderBy: { createdAt: "desc" },
    take: LIST_PAGE_SIZE + 1,
  });
  const { items, hasMore } = paginateTakePlusOne(rows, LIST_PAGE_SIZE);

  return <CompanyClient initialCompanies={items} initialHasMore={hasMore} />;
}
