"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";

type ToastVariant = "default" | "success" | "danger" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev, { id, message, variant }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 no-print">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg",
              item.variant === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-900",
              item.variant === "danger" &&
                "border-red-200 bg-red-50 text-red-900",
              item.variant === "info" &&
                "border-tda-navy/20 bg-white text-tda-navy",
              item.variant === "default" &&
                "border-slate-200 bg-white text-slate-800",
            )}
            role="status"
          >
            <p className="flex-1">{item.message}</p>
            <button
              type="button"
              className="rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
              onClick={() =>
                setItems((prev) => prev.filter((t) => t.id !== item.id))
              }
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (message: string) => {
        window.alert(message);
      },
    };
  }
  return ctx;
}
