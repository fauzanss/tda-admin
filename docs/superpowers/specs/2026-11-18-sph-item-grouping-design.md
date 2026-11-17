# SPH Item Grouping — Design Spec

**Date:** 2026-11-18  
**Status:** Approved for planning  
**Scope:** Surat Penawaran Harga (SPH) only

## Problem

SPH line items are a flat list. For some offers, items need to be shown under site/category sections (e.g. `Manufacturing`, `SKK`) so the preview, print, and Excel export match how the deal is structured.

## Goals

- Optional one-level group label per SPH item (free text).
- Edit form can set Group per item.
- Preview/print and Excel show group header → items → group subtotal.
- Ungrouped items stay flat (no header, no subtotal).
- Document-level totals (Subtotal / PPN / Total) unchanged.

## Non-goals (v1)

- Two-level / BOM-style subgroups
- Fixed group catalog or settings UI
- Manual group reorder control
- Rename-group-across-items helper
- Grouping on non-SPH document types

## Decisions

| Topic | Choice |
| --- | --- |
| Depth | One level |
| Input | Free text |
| Required? | Optional; blank/whitespace → ungrouped |
| Surfaces | Preview/print + Excel |
| Subtotals | Per group yes; document totals as today |
| Group order | First appearance in item `sortOrder` |
| Visual style | Navy headers matching existing SPH table header; light gray subtotal rows |

## Data model

Add nullable field on `SphItem`:

```prisma
groupName String?
```

Rules:

- Persist only for SPH items.
- Trim on save; empty string → `null`.
- Case-sensitive after trim (`SKK` ≠ `skk`).
- Soft max length ~100 characters on save.
- Existing rows remain `null` (behavior identical to today).
- No `SphGroup` table; no group-level `sortOrder` column.

## Shared grouping helper

Introduce a pure helper (e.g. `groupSphItems(items)`) used by preview and Excel:

1. Walk items in `sortOrder`.
2. Collect ungrouped items (`groupName` null/blank after trim) into one flat block.
3. For grouped items, open a section on first seen `groupName`; append later items with the same name to that section, preserving relative order.
4. Emit render model: ungrouped items, then sections `{ name, items, subtotal }` where `subtotal` is sum of `quantity * unitPrice`.

Preview and Excel must not reimplement this logic independently.

## Edit form

In `DocumentForm` (SPH item cards only):

- Add optional **Group** text input above **Item Name**.
- Placeholder example: `e.g. SKK, Manufacturing`.
- Include `groupName` in line state, create/update payload, and SPH duplicate flow.
- No dropdown, no required validation, no dedicated group-reorder UI.
- Reordering item rows continues to use existing controls; that order drives first-appearance group order.

## Preview / print

- Columns unchanged.
- Render order: ungrouped item rows → each group section.
- Group header: single row spanning columns, navy fill (`#2C3E50`), white bold group name.
- Group subtotal: light gray row, bold label `Subtotal {groupName}` (ID/EN via i18n), amount right-aligned.
- Document totals block unchanged below the table.
- Print uses the same preview markup/CSS.

## Excel export

Update `lib/sph-excel-export.ts` with the same helper:

- Insert navy merged header rows and gray subtotal rows between item rows.
- No new sheets or columns; grouping is row structure only.
- Document totals (Subtotal / PPN / Total) remain at the bottom with current rules.

## Edge cases

- Whitespace-only Group → `null` (ungrouped).
- All items ungrouped → identical to current flat table.
- Single-item group → still header + item + subtotal.
- Same group name on non-contiguous rows → one section; items ordered by global `sortOrder`.
- Mixing grouped and ungrouped: ungrouped block first, then groups by first appearance among grouped items.

## Testing

- Unit tests for `groupSphItems`: ungrouped-only, all grouped, mixed, first-appearance order, subtotal math, trim/blank handling.
- Manual: edit Group → save → preview → Excel; duplicate SPH preserves `groupName`.

## Implementation touchpoints (expected)

- `prisma/schema.prisma` + migration
- `DocumentForm.tsx` (SPH lines)
- Document create/update actions / parsers for SPH items
- `DocumentPreviewView.tsx` (+ i18n strings)
- `lib/sph-excel-export.ts`
- New helper module + unit tests
- SPH duplicate path if it copies items explicitly

## Open follow-ups (explicitly deferred)

- Case-insensitive group matching
- Bulk rename of a group label
- Two-level subgroups / ConfigGroup-style BOM import
