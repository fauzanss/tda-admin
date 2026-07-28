"use client";

import {
  FilterableSelect,
  type FilterableSelectOption,
} from "@/components/ui/filterable-select";

export type CompanySelectOption = {
  id: string;
  companyName: string;
  companyAlias?: string | null;
};

export function CompanySelect({
  id,
  companies,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Select Company",
  className,
  disabled,
  includeInactive = true,
}: {
  id?: string;
  companies: Array<CompanySelectOption & { isActive?: boolean }>;
  defaultValue?: string;
  value?: string;
  onChange?: (companyId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  includeInactive?: boolean;
}) {
  const options: FilterableSelectOption[] = companies
    .filter((company) => includeInactive || company.isActive !== false)
    .map((company) => {
      const alias = company.companyAlias?.trim();
      return {
        value: company.id,
        label: alias ? `${company.companyName} (${alias})` : company.companyName,
        keywords: `${company.companyName} ${alias ?? ""}`,
      };
    });

  return (
    <FilterableSelect
      id={id}
      options={options}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Filter company..."
      emptyText="No company found."
      className={className}
      disabled={disabled}
    />
  );
}
