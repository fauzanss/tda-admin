import { prisma } from "@/lib/prisma";
import { listIncomingPoOptions } from "@/lib/po-payment";
import { notDeleted } from "@/lib/soft-delete";

export async function getPoKeluarFormData() {
  const [companies, purchaseOrdersRaw, suratJalans, incomingPoRaw] = await Promise.all([
    prisma.company.findMany({
      where: { isActive: true, ...notDeleted },
      orderBy: { companyName: "asc" },
      select: {
        id: true,
        companyName: true,
        companyAlias: true,
        address: true,
        isActive: true,
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { ...notDeleted },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentNumber: true,
        orderToName: true,
        orderToAddress: true,
        deliveredToName: true,
        deliveredToAddress: true,
        items: {
          orderBy: { sortOrder: "asc" },
          select: {
            description: true,
            detail: true,
            quantity: true,
            unit: true,
            unitPrice: true,
          },
        },
      },
    }),
    prisma.suratJalan.findMany({
      where: { ...notDeleted },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        documentNumber: true,
      },
    }),
    listIncomingPoOptions(),
  ]);

  const purchaseOrders = purchaseOrdersRaw.map((po) => ({
    ...po,
    items: po.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  }));

  const incomingPoOptions = incomingPoRaw.map((po) => ({
    id: po.id,
    label: `${po.poNumber ?? "-"} — ${po.distributorName}`,
  }));

  return { companies, purchaseOrders, suratJalans, incomingPoOptions };
}
