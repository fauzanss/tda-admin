"use client";

import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export type FilterableSelectOption = {
  value: string;
  label: string;
  keywords?: string;
};

export function FilterableSelect({
  id,
  options,
  defaultValue = "",
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Type to filter...",
  emptyText = "No results.",
  className,
  disabled,
}: {
  id?: string;
  options: FilterableSelectOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;

  const selected = options.find((item) => item.value === selectedValue) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((item) => {
      const haystack = `${item.label} ${item.keywords ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  function selectValue(next: string) {
    if (value === undefined) {
      setInternalValue(next);
    }
    onChange?.(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={controlId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-left text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tda-orange/40 disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-slate-400",
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronsUpDown size={14} className="shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-2 py-1.5">
            <Search size={14} className="shrink-0 text-slate-400" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              aria-label={searchPlaceholder}
            />
          </div>
          <ul
            role="listbox"
            aria-labelledby={controlId}
            className="max-h-56 overflow-y-auto py-1"
          >
            <li>
              <button
                type="button"
                role="option"
                aria-selected={selectedValue === ""}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
                onClick={() => selectValue("")}
              >
                {placeholder}
              </button>
            </li>
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-tda-navy-muted">{emptyText}</li>
            )}
            {filtered.map((item) => {
              const isSelected = item.value === selectedValue;
              return (
                <li key={item.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-tda-navy/5",
                      isSelected && "bg-tda-orange/10 text-tda-navy",
                    )}
                    onClick={() => selectValue(item.value)}
                  >
                    <Check
                      size={14}
                      className={cn(
                        "shrink-0",
                        isSelected ? "opacity-100 text-tda-orange" : "opacity-0",
                      )}
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
