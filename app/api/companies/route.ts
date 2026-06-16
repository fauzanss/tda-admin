import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function getCompanyDelegate() {
  return (prisma as unknown as {
    company?: {
      findMany: (args: unknown) => Promise<unknown>;
      create: (args: unknown) => Promise<unknown>;
    };
  }).company;
}

export async function GET() {
  const company = getCompanyDelegate();
  if (company) {
    const rows = await company.findMany({
      orderBy: [{ isActive: "desc" }, { companyName: "asc" }],
    });
    return NextResponse.json(rows);
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      companyName: string;
      companyAlias: string | null;
      address: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`SELECT id, companyName, companyAlias, address, isActive, createdAt, updatedAt FROM Company ORDER BY isActive DESC, companyName ASC`;

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    companyName: string;
    companyAlias?: string;
    address: string;
    isActive: boolean;
  };

  const company = getCompanyDelegate();
  if (company) {
    const created = await company.create({
      data: {
        companyName: body.companyName.trim(),
        companyAlias: body.companyAlias?.trim() || null,
        address: body.address.trim(),
        isActive: body.isActive,
      },
    });
    return NextResponse.json(created);
  }

  await prisma.$executeRaw`
    INSERT INTO Company (id, identifier, companyName, companyAlias, address, isActive, createdAt, updatedAt)
    VALUES (UUID(), UUID(), ${body.companyName.trim()}, ${body.companyAlias?.trim() || null}, ${body.address.trim()}, ${body.isActive}, NOW(), NOW())
  `;
  return NextResponse.json({ ok: true });
}
