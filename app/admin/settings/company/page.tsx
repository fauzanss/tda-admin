import { CompanyClient } from "@/app/admin/settings/company/CompanyClient";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export default async function CompanySettingsPage() {
  const companies = await prisma.company.findMany({
    where: { ...notDeleted },
    orderBy: [{ isActive: "desc" }, { companyName: "asc" }],
  });

  return <CompanyClient initialCompanies={companies} />;
}
