"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function PrintButton() {
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "1";

  useEffect(() => {
    if (!shouldAutoPrint) {
      return;
    }
    const timer = window.setTimeout(() => {
      window.print();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [shouldAutoPrint]);

  return (
    <button
      type="button"
      className="print-button no-print"
      onClick={() => window.print()}
    >
      Print / Export PDF
    </button>
  );
}
