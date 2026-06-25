import { DocumentType } from "@/generated/prisma/client";

import { createDocument } from "@/app/admin/documents/actions";
import { DocumentForm } from "@/app/admin/documents/DocumentForm";
import { getPoKeluarFormData } from "@/app/admin/po-keluar/form-data";
import { authOptions } from "@/lib/auth";
import { canWriteFiles } from "@/lib/role-guards";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

const PO_KELUAR_TYPE = DocumentType.PURCHASE_ORDER;

export default async function NewPoKeluarPage() {
  const session = await getServerSession(authOptions);
  if (!canWriteFiles(session?.user?.role as string | undefined)) {
    redirect("/admin/po-keluar");
  }

  const { companies, purchaseOrders, suratJalans } = await getPoKeluarFormData();

  async function onSubmit(formData: FormData) {
    "use server";
    await createDocument(formData);
  }

  return (
    <main>
      <h1 className="h3 fw-semibold mb-3">New PO Keluar</h1>
      <DocumentForm
        type={PO_KELUAR_TYPE}
        companies={companies}
        purchaseOrders={purchaseOrders}
        suratJalans={suratJalans}
        onSubmit={onSubmit}
        submitLabel="Save Draft"
      />
    </main>
  );
}
