"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roles";
import { notDeleted } from "@/lib/soft-delete";

const schema = z.object({
  companyName: z.string().min(1),
  companyAlias: z.string().optional(),
  address: z.string().min(1),
  website: z.string().optional(),
  isActive: z.enum(["true", "false"]).default("true"),
});

function toNullable(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getCompanyDelegate() {
  return (prisma as unknown as {
    company?: {
      create: (args: unknown) => Promise<unknown>;
      update: (args: unknown) => Promise<unknown>;
      updateMany: (args: unknown) => Promise<{ count: number }>;
    };
  }).company;
}

export async function createCompany(formData: FormData) {
  await requireAdmin();
  const input = schema.parse({
    companyName: String(formData.get("companyName") ?? ""),
    companyAlias: String(formData.get("companyAlias") ?? ""),
    address: String(formData.get("address") ?? ""),
    website: String(formData.get("website") ?? ""),
    isActive: String(formData.get("isActive") ?? "true"),
  });

  const company = getCompanyDelegate();
  if (company) {
    await company.create({
      data: {
        companyName: input.companyName.trim(),
        companyAlias: toNullable(input.companyAlias),
        address: input.address.trim(),
        website: toNullable(input.website),
        isActive: input.isActive === "true",
      },
    });
  } else {
    const id = randomUUID();
    const identifier = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO Company (id, identifier, companyName, companyAlias, address, website, isActive, createdAt, updatedAt, deletedAt)
      VALUES (${id}, ${identifier}, ${input.companyName.trim()}, ${toNullable(input.companyAlias)}, ${input.address.trim()}, ${toNullable(input.website)}, ${input.isActive === "true"}, NOW(), NOW(), NULL)
    `;
  }

  revalidatePath("/admin/settings/company");
}

export async function updateCompany(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const input = schema.parse({
    companyName: String(formData.get("companyName") ?? ""),
    companyAlias: String(formData.get("companyAlias") ?? ""),
    address: String(formData.get("address") ?? ""),
    website: String(formData.get("website") ?? ""),
    isActive: String(formData.get("isActive") ?? "true"),
  });

  const company = getCompanyDelegate();
  if (company) {
    const updated = await company.updateMany({
      where: { id, ...notDeleted },
      data: {
        companyName: input.companyName.trim(),
        companyAlias: toNullable(input.companyAlias),
        address: input.address.trim(),
        website: toNullable(input.website),
        isActive: input.isActive === "true",
      },
    });
    if (updated.count === 0) {
      throw new Error("Company not found or deleted");
    }
  } else {
    await prisma.$executeRaw`
      UPDATE Company
      SET companyName = ${input.companyName.trim()},
          companyAlias = ${toNullable(input.companyAlias)},
          address = ${input.address.trim()},
          website = ${toNullable(input.website)},
          isActive = ${input.isActive === "true"},
          updatedAt = NOW()
      WHERE id = ${id} AND deletedAt IS NULL
    `;
  }

  revalidatePath("/admin/settings/company");
}

export async function deleteCompany(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await deleteCompanyById(id);
}

export async function deleteCompanyById(id: string) {
  await requireAdmin();
  const company = getCompanyDelegate();
  if (company) {
    const u = await company.updateMany({ where: { id, ...notDeleted }, data: { deletedAt: new Date() } });
    if (u.count === 0) {
      throw new Error("Not found or already deleted");
    }
  } else {
    await prisma.$executeRaw`
      UPDATE Company
      SET deletedAt = NOW(), updatedAt = NOW()
      WHERE id = ${id} AND deletedAt IS NULL
    `;
  }
  revalidatePath("/admin/settings/company");
}
