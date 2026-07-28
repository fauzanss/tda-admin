"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

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
    <Button
      type="button"
      variant="secondary"
      className="no-print fixed right-5 top-[88px] z-50 shadow-md"
      onClick={() => window.print()}
    >
      <Printer size={16} aria-hidden />
      Print / Export PDF
    </Button>
  );
}
