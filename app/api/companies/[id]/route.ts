import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/roles";
import { notDeleted } from "@/lib/soft-delete";

function getCompanyDelegate() {
  return (prisma as unknown as {
    company?: {
      update: (args: unknown) => Promise<unknown>;
      updateMany: (args: unknown) => Promise<{ count: number }>;
    };
  }).company;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await request.json()) as {
    companyName: string;
    companyAlias?: string;
    address: string;
    website?: string;
    isActive: boolean;
  };

  const company = getCompanyDelegate();
  if (company) {
    const result = await company.updateMany({
      where: { id, ...notDeleted },
      data: {
        companyName: body.companyName.trim(),
        companyAlias: body.companyAlias?.trim() || null,
        address: body.address.trim(),
        website: body.website?.trim() || null,
        isActive: body.isActive,
      },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Not found or deleted" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, id });
  }

  const raw = await prisma.$executeRaw`
    UPDATE Company
    SET companyName = ${body.companyName.trim()},
        companyAlias = ${body.companyAlias?.trim() || null},
        address = ${body.address.trim()},
        website = ${body.website?.trim() || null},
        isActive = ${body.isActive},
        updatedAt = NOW()
    WHERE id = ${id} AND deletedAt IS NULL
  `;
  if (Number(raw) === 0) {
    return NextResponse.json({ error: "Not found or deleted" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const company = getCompanyDelegate();
  if (company) {
    const u = await company.updateMany({
      where: { id, ...notDeleted },
      data: { deletedAt: new Date() },
    });
    if (u.count === 0) {
      return NextResponse.json({ error: "Not found or deleted" }, { status: 404 });
    }
  } else {
    const raw = await prisma.$executeRaw`
      UPDATE Company SET deletedAt = NOW(), updatedAt = NOW()
      WHERE id = ${id} AND deletedAt IS NULL
    `;
    if (Number(raw) === 0) {
      return NextResponse.json({ error: "Not found or deleted" }, { status: 404 });
    }
  }
  return NextResponse.json({ ok: true });
}
