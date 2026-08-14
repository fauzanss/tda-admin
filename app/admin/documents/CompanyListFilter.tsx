"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CompanySelect, type CompanySelectOption } from "@/components/admin/CompanySelect";

export function CompanyListFilter({
  companies,
  selectedId,
}: {
  companies: Array<CompanySelectOption & { isActive?: boolean }>;
  selectedId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="w-full sm:w-[32rem]">
      <CompanySelect
        id="company-destination-filter"
        companies={companies}
        value={selectedId}
        placeholder="All companies"
        className="w-full"
        onChange={(companyId) => {
          const params = new URLSearchParams(searchParams.toString());
          if (companyId) {
            params.set("company", companyId);
          } else {
            params.delete("company");
          }
          const query = params.toString();
          router.push(query ? `${pathname}?${query}` : pathname);
        }}
      />
    </div>
  );
}
