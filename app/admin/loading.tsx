import { Spinner } from "@/components/ui/spinner";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Spinner size={28} />
      <p className="text-sm text-tda-navy-muted">Loading...</p>
    </div>
  );
}
