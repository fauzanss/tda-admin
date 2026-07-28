"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { markInstallmentPaid } from "@/app/admin/po/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function MarkInstallmentPaidButton({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
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
      {loading ? (
        <>
          <Spinner size={14} className="text-current" />
          ...
        </>
      ) : (
        "Mark Paid"
      )}
    </Button>
  );
}
