"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type PoLinkOption = {
  id: string;
  label: string;
};

export function PoLinkSelector({
  name,
  label,
  options,
  initialSelectedIds = [],
}: Readonly<{
  name: string;
  label: string;
  options: PoLinkOption[];
  initialSelectedIds?: string[];
}>) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [query, setQuery] = useState("");

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="col-span-full space-y-2">
      <Label>{label}</Label>
      <input type="hidden" name={name} value={JSON.stringify(selectedIds)} />
      <Input
        type="search"
        className="h-8 text-xs"
        placeholder="Search..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="max-h-[180px] overflow-y-auto rounded-md border border-slate-200 p-2">
        {filtered.length === 0 && (
          <p className="text-xs text-tda-navy-muted">No options found.</p>
        )}
        {filtered.map((option) => (
          <label
            key={option.id}
            className="mb-1 flex cursor-pointer items-center gap-2 text-xs text-slate-700 last:mb-0"
          >
            <input
              type="checkbox"
              className="rounded border-slate-300 text-tda-orange focus:ring-tda-orange/40"
              checked={selectedIds.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-tda-navy-muted">{selectedIds.length} selected</p>
      )}
    </div>
  );
}
