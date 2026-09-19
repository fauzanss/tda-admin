import { NextResponse } from "next/server";

import { LIST_PAGE_SIZE, paginateTakePlusOne } from "@/lib/list-pagination";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

type CompanyRow = {
  id: string;
  identifier: string;
  companyName: string;
  companyAlias: string | null;
  address: string;
  website: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const skip = Math.max(0, Number(searchParams.get("skip") ?? "0") || 0);
  const takeRaw = Number(searchParams.get("take") ?? String(LIST_PAGE_SIZE)) || LIST_PAGE_SIZE;
  const take = Math.min(Math.max(1, takeRaw), 100);

  let rows: CompanyRow[];

  if (q) {
    // Prisma `contains` binds params as utf8mb4_bin and clashes with column utf8mb4_unicode_ci.
    const pattern = `%${q}%`;
    rows = await prisma.$queryRaw<CompanyRow[]>`
      SELECT id, identifier, companyName, companyAlias, address, website, isActive, createdAt, updatedAt, deletedAt
      FROM Company
      WHERE deletedAt IS NULL
        AND companyName LIKE CONVERT(${pattern} USING utf8mb4) COLLATE utf8mb4_unicode_ci
      ORDER BY createdAt DESC
      LIMIT ${take + 1} OFFSET ${skip}
    `;
  } else {
    rows = await prisma.company.findMany({
      where: { ...notDeleted },
      orderBy: { createdAt: "desc" },
      skip,
      take: take + 1,
    });
  }

  const { items, hasMore } = paginateTakePlusOne(rows, take);
  return NextResponse.json({ items, hasMore });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    companyName: string;
    companyAlias?: string;
    address: string;
    website?: string;
    isActive: boolean;
  };

  const created = await prisma.company.create({
    data: {
      companyName: body.companyName.trim(),
      companyAlias: body.companyAlias?.trim() || null,
      address: body.address.trim(),
      website: body.website?.trim() || null,
      isActive: body.isActive,
    },
  });
  return NextResponse.json(created);
}
