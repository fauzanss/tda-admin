import { Inbox } from "lucide-react";

import { cn } from "@/lib/cn";

export function EmptyState({
  title = "No data available",
  description,
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-12 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-tda-navy/5 p-3 text-tda-navy-muted">
        <Inbox size={22} aria-hidden />
      </div>
      <p className="text-sm font-medium text-tda-navy">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-tda-navy-muted">{description}</p>
      ) : null}
    </div>
  );
}
