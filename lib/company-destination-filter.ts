import { Prisma } from "@/generated/prisma/client";

export type DestinationCompany = {
  id: string;
  companyName: string;
  companyAlias: string | null;
};

export function destinationNameFilter(
  company: DestinationCompany | null | undefined,
): string[] {
  if (!company) {
    return [];
  }
  return [company.companyName, company.companyAlias]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

export function stringFieldInNames(
  names: string[],
): Prisma.StringNullableFilter | undefined {
  if (names.length === 0) {
    return undefined;
  }
  if (names.length === 1) {
    return { equals: names[0] };
  }
  return { in: names };
}
