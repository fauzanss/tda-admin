import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

export function Spinner({
  className,
  size = 20,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Loader2
      className={cn("animate-spin text-tda-orange", className)}
      size={size}
      aria-hidden
    />
  );
}
