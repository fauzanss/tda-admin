import Link from "next/link";

import { createPoMasuk } from "@/app/admin/po-masuk/actions";
import { PoMasukForm } from "@/app/admin/po-masuk/PoMasukForm";
import { PageHeader } from "@/components/admin/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { listOutgoingPoOptions } from "@/lib/po-payment";

export default async function NewPoMasukPage() {
  const outgoingPoOptions = (await listOutgoingPoOptions()).map((po) => ({
    id: po.id,
    label: `${po.documentNumber ?? "(Draft)"} — ${po.orderToName ?? "-"}`,
  }));

  return (
    <main>
      <PageHeader
        title="New PO Masuk"
        actions={
          <Link
            href="/admin/po-masuk"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Back to list
          </Link>
        }
      />

      <PoMasukForm
        action={createPoMasuk}
        submitLabel="Save PO Masuk"
        outgoingPoOptions={outgoingPoOptions}
        requireGdriveLink
      />
    </main>
  );
}
