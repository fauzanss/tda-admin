import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

const alertVariants = cva("rounded-lg border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "border-slate-200 bg-slate-50 text-slate-800",
      success: "border-emerald-200 bg-emerald-50 text-emerald-800",
      warning: "border-amber-200 bg-amber-50 text-amber-900",
      danger: "border-red-200 bg-red-50 text-red-800",
      info: "border-tda-navy/20 bg-tda-navy/5 text-tda-navy",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}
