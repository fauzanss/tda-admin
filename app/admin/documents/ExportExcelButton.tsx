"use client";

import { FileSpreadsheet } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ExportExcelButton({
  href,
}: Readonly<{
  href: string;
}>) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      className="no-print fixed right-5 top-[136px] z-50 shadow-md"
      disabled={pending}
      onClick={() => {
        setPending(true);
        window.location.assign(href);
        window.setTimeout(() => setPending(false), 1500);
      }}
    >
      <FileSpreadsheet size={16} aria-hidden />
      {pending ? "Exporting…" : "Export Excel"}
    </Button>
  );
}
