"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { markInstallmentPaid } from "@/app/admin/po/actions";

export function MarkInstallmentPaidButton({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-outline-success btn-sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await markInstallmentPaid(id);
          router.refresh();
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "..." : "Mark Paid"}
    </button>
  );
}
