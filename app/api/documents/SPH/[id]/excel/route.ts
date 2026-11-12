import { NextResponse } from "next/server";

import { buildSphExcelBuffer } from "@/lib/sph-excel-export";
import { buildDocumentPrintFileName } from "@/lib/print-file-name";
import { prisma } from "@/lib/prisma";
import { getSessionUserRole } from "@/lib/roles";
import { notDeleted } from "@/lib/soft-delete";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const document = await prisma.sph.findFirst({
    where: { id, ...notDeleted },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const company = await prisma.companyProfile.findFirst();
  const buffer = await buildSphExcelBuffer(document, company);
  const fileName = `${buildDocumentPrintFileName(document.documentNumber, "SPH")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
