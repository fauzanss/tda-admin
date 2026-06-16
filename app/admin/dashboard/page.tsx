import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export default async function DashboardPage() {
  const [draftCount, finalCount] = await Promise.all([
    Promise.all([
      prisma.invoice.count({ where: { status: "DRAFT", ...notDeleted } }),
      prisma.purchaseOrder.count({ where: { status: "DRAFT", ...notDeleted } }),
      prisma.suratJalan.count({ where: { status: "DRAFT", ...notDeleted } }),
      prisma.sph.count({ where: { status: "DRAFT", ...notDeleted } }),
    ]).then((counts) => counts.reduce((sum, item) => sum + item, 0)),
    Promise.all([
      prisma.invoice.count({ where: { status: "FINAL", ...notDeleted } }),
      prisma.purchaseOrder.count({ where: { status: "FINAL", ...notDeleted } }),
      prisma.suratJalan.count({ where: { status: "FINAL", ...notDeleted } }),
      prisma.sph.count({ where: { status: "FINAL", ...notDeleted } }),
    ]).then((counts) => counts.reduce((sum, item) => sum + item, 0)),
  ]);

  return (
    <main>
      <h1 className="h3 fw-semibold mb-3">Dashboard</h1>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <p className="text-muted mb-1">Draft Documents</p>
              <p className="display-6 fw-bold mb-0">{draftCount}</p>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card">
            <div className="card-body">
              <p className="text-muted mb-1">Final Documents</p>
              <p className="display-6 fw-bold mb-0">{finalCount}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
