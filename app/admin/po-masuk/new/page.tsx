import Link from "next/link";

import { createPoMasuk } from "@/app/admin/po-masuk/actions";
import { PoMasukForm } from "@/app/admin/po-masuk/PoMasukForm";
import { listOutgoingPoOptions } from "@/lib/po-payment";

export default async function NewPoMasukPage() {
  const outgoingPoOptions = (await listOutgoingPoOptions()).map((po) => ({
    id: po.id,
    label: `${po.documentNumber ?? "(Draft)"} — ${po.orderToName ?? "-"}`,
  }));

  return (
    <main>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 fw-semibold mb-0">New PO Masuk</h1>
        <Link href="/admin/po-masuk" className="btn btn-outline-secondary btn-sm">
          Back to list
        </Link>
      </div>

      <PoMasukForm
        action={createPoMasuk}
        submitLabel="Save PO Masuk"
        outgoingPoOptions={outgoingPoOptions}
        requireGdriveLink
      />
    </main>
  );
}
