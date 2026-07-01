"use client";

import { useState } from "react";

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
    <div className="col-12">
      <label className="form-label">{label}</label>
      <input type="hidden" name={name} value={JSON.stringify(selectedIds)} />
      <input
        type="search"
        className="form-control form-control-sm mb-2"
        placeholder="Search..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="border rounded p-2" style={{ maxHeight: 180, overflowY: "auto" }}>
        {filtered.length === 0 && <div className="text-muted small">No options found.</div>}
        {filtered.map((option) => (
          <label key={option.id} className="d-flex align-items-center gap-2 small mb-1">
            <input
              type="checkbox"
              checked={selectedIds.includes(option.id)}
              onChange={() => toggle(option.id)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {selectedIds.length > 0 && (
        <div className="form-text">{selectedIds.length} selected</div>
      )}
    </div>
  );
}
