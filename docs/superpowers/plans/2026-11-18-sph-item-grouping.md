# SPH Item Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let SPH line items carry an optional free-text `groupName` so preview/print and Excel render navy group headers, items, and per-group subtotals.

**Architecture:** Persist `groupName` on `SphItem`. Normalize and group via a pure helper (`lib/sph-item-grouping.ts`) shared by `DocumentPreviewView` and `sph-excel-export`. Edit form and server actions accept optional Group; non-SPH document types never persist `groupName`.

**Tech Stack:** Next.js (App Router), Prisma/`SphItem`, React form (`DocumentForm`), ExcelJS, Node.js built-in test runner via `tsx --test`.

## Global Constraints

- SPH only — do not add grouping to PO, Invoice, Perform Invoice, or Surat Jalan.
- One-level free-text groups; optional; blank/whitespace → `null`.
- Case-sensitive after trim; max length 100 on save.
- Group order = first appearance among grouped items; ungrouped block renders first.
- Visual style A: navy `#2C3E50` headers, light gray subtotal rows.
- Document-level Subtotal / PPN / Total unchanged.
- Commit messages: `SCOL-1234 short description` (replace ticket if known).
- Do not refactor unrelated code.

## File map

| File | Responsibility |
| --- | --- |
| `lib/sph-item-grouping.ts` | `normalizeGroupName`, `groupSphItems` |
| `lib/sph-item-grouping.test.ts` | Unit tests for helper |
| `prisma/schema.prisma` | `SphItem.groupName String?` |
| `package.json` | `test` script |
| `app/admin/documents/actions.ts` | Zod + persist + SPH duplicate |
| `app/admin/documents/DocumentForm.tsx` | Group input on SPH lines |
| `app/admin/documents/[type]/[id]/edit/page.tsx` | Map `groupName` into form defaults |
| `lib/document-i18n.ts` | `groupSubtotal(name)` string helper |
| `app/globals.css` | Group header / subtotal row styles |
| `app/admin/documents/DocumentPreviewView.tsx` | Render grouped SPH table |
| `lib/sph-excel-export.ts` | Export grouped rows |

---

### Task 1: Grouping helper + unit tests

**Files:**
- Create: `lib/sph-item-grouping.ts`
- Create: `lib/sph-item-grouping.test.ts`
- Modify: `package.json` (add `"test": "tsx --test 'lib/**/*.test.ts'"`)

**Interfaces:**
- Produces:
  - `normalizeGroupName(value: string | null | undefined, maxLength?: number): string | null`
  - `groupSphItems<T extends { groupName?: string | null; quantity: unknown; unitPrice: unknown }>(items: T[]): { ungrouped: T[]; groups: Array<{ name: string; items: T[]; subtotal: number }> }`
- Consumes: none

- [ ] **Step 1: Add test script to `package.json`**

Add under `"scripts"`:

```json
"test": "tsx --test 'lib/**/*.test.ts'"
```

- [ ] **Step 2: Write the failing tests**

Create `lib/sph-item-grouping.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupSphItems, normalizeGroupName } from "@/lib/sph-item-grouping";

describe("normalizeGroupName", () => {
  it("returns null for blank or whitespace", () => {
    assert.equal(normalizeGroupName(null), null);
    assert.equal(normalizeGroupName(""), null);
    assert.equal(normalizeGroupName("   "), null);
  });

  it("trims and caps length at 100", () => {
    assert.equal(normalizeGroupName("  SKK  "), "SKK");
    const long = "x".repeat(120);
    assert.equal(normalizeGroupName(long)?.length, 100);
  });
});

describe("groupSphItems", () => {
  it("keeps all-ungrouped flat with no groups", () => {
    const items = [
      { id: "1", groupName: null, quantity: 1, unitPrice: 10 },
      { id: "2", groupName: "  ", quantity: 2, unitPrice: 5 },
    ];
    const result = groupSphItems(items);
    assert.deepEqual(
      result.ungrouped.map((i) => i.id),
      ["1", "2"],
    );
    assert.equal(result.groups.length, 0);
  });

  it("puts ungrouped first and groups by first appearance", () => {
    const items = [
      { id: "a", groupName: "Manufacturing", quantity: 1, unitPrice: 100 },
      { id: "b", groupName: null, quantity: 1, unitPrice: 50 },
      { id: "c", groupName: "SKK", quantity: 2, unitPrice: 10 },
      { id: "d", groupName: "Manufacturing", quantity: 1, unitPrice: 20 },
    ];
    const result = groupSphItems(items);
    assert.deepEqual(
      result.ungrouped.map((i) => i.id),
      ["b"],
    );
    assert.deepEqual(
      result.groups.map((g) => g.name),
      ["Manufacturing", "SKK"],
    );
    assert.deepEqual(
      result.groups[0].items.map((i) => i.id),
      ["a", "d"],
    );
    assert.equal(result.groups[0].subtotal, 120);
    assert.equal(result.groups[1].subtotal, 20);
  });

  it("treats SKK and skk as different groups", () => {
    const result = groupSphItems([
      { groupName: "SKK", quantity: 1, unitPrice: 1 },
      { groupName: "skk", quantity: 1, unitPrice: 1 },
    ]);
    assert.deepEqual(
      result.groups.map((g) => g.name),
      ["SKK", "skk"],
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`

Expected: FAIL (module `@/lib/sph-item-grouping` not found / cannot import)

- [ ] **Step 4: Implement helper**

Create `lib/sph-item-grouping.ts`:

```ts
export function normalizeGroupName(
  value: string | null | undefined,
  maxLength = 100,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  if (value != null && typeof value === "object" && "toString" in value) {
    return Number(String(value));
  }
  return 0;
}

export type SphGroupedSection<T> = {
  name: string;
  items: T[];
  subtotal: number;
};

export type SphGroupedResult<T> = {
  ungrouped: T[];
  groups: SphGroupedSection<T>[];
};

export function groupSphItems<
  T extends { groupName?: string | null; quantity: unknown; unitPrice: unknown },
>(items: T[]): SphGroupedResult<T> {
  const ungrouped: T[] = [];
  const groups: SphGroupedSection<T>[] = [];
  const indexByName = new Map<string, number>();

  for (const item of items) {
    const name = normalizeGroupName(item.groupName ?? null);
    if (!name) {
      ungrouped.push(item);
      continue;
    }

    const existing = indexByName.get(name);
    const lineTotal = toNumber(item.quantity) * toNumber(item.unitPrice);
    if (existing === undefined) {
      indexByName.set(name, groups.length);
      groups.push({ name, items: [item], subtotal: lineTotal });
    } else {
      groups[existing].items.push(item);
      groups[existing].subtotal += lineTotal;
    }
  }

  return { ungrouped, groups };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`

Expected: PASS (all tests)

- [ ] **Step 6: Commit**

```bash
git add package.json lib/sph-item-grouping.ts lib/sph-item-grouping.test.ts
git commit -m "$(cat <<'EOF'
SCOL-1234 add sph item grouping helper

EOF
)"
```

---

### Task 2: Prisma `SphItem.groupName`

**Files:**
- Modify: `prisma/schema.prisma` (`SphItem` model ~365–378)
- Run migration / generate client

**Interfaces:**
- Consumes: none
- Produces: `SphItem.groupName: string | null`

- [ ] **Step 1: Add field to schema**

In `model SphItem`, after `currency` (or beside other item fields), add:

```prisma
  groupName String?
```

- [ ] **Step 2: Apply schema to DB and regenerate client**

Run:

```bash
npx prisma migrate dev --name add_sph_item_group_name
```

If the project has no prior migrations and migrate fails, use:

```bash
npx prisma db push
npx prisma generate
```

Expected: client regenerates with `groupName` on `SphItem`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "$(cat <<'EOF'
SCOL-1234 add sphitem groupname column

EOF
)"
```

(If only `db push` was used and no migration folder was created, commit `schema.prisma` only.)

---

### Task 3: Persist `groupName` on create / update / duplicate

**Files:**
- Modify: `app/admin/documents/actions.ts`
- Modify: `app/admin/documents/[type]/[id]/edit/page.tsx` (lines mapping ~174–181)

**Interfaces:**
- Consumes: `normalizeGroupName` from `@/lib/sph-item-grouping`
- Produces: SPH item create/update/duplicate payloads include `groupName`

- [ ] **Step 1: Extend `lineSchema` and `buildDocumentInput`**

In `actions.ts`:

```ts
import { normalizeGroupName } from "@/lib/sph-item-grouping";
```

Update `lineSchema`:

```ts
const lineSchema = z.object({
  description: z.string().min(1),
  detail: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  unitPrice: z.number().min(0),
  taxable: z.boolean().optional(),
  groupName: z.string().optional().nullable(),
});
```

In the `lines:` map inside `buildDocumentInput`, **only for SPH** attach groupName. Change the map to:

```ts
    lines: payload.lines.map((line, index) => {
      const base = {
        sortOrder: index + 1,
        description: line.description,
        detail: toNullable(line.detail),
        quantity: line.quantity,
        unit: toNullable(line.unit),
        unitPrice: line.unitPrice,
        taxable: line.taxable !== false,
      };
      if (payload.type === "SPH") {
        return {
          ...base,
          groupName: normalizeGroupName(line.groupName ?? null),
        };
      }
      return base;
    }),
```

This keeps `groupName` off Surat Jalan / PO / Invoice creates that reuse `withoutTaxable(input.lines)`.

- [ ] **Step 2: Copy `groupName` on SPH duplicate**

In `duplicateDocument` SPH branch (`items.create` map ~897–905), add:

```ts
groupName: item.groupName,
```

- [ ] **Step 3: Map `groupName` on edit page**

In `[type]/[id]/edit/page.tsx` lines mapping:

```ts
    lines: document.items.map((line) => ({
      description: line.description,
      detail: line.detail ?? null,
      quantity: Number(line.quantity),
      unit: line.unit ?? null,
      unitPrice: Number(line.unitPrice),
      taxable: "taxable" in line ? Boolean(line.taxable) : true,
      groupName: "groupName" in line ? (line.groupName as string | null) : null,
    })),
```

- [ ] **Step 4: Smoke-check TypeScript for actions**

Run: `npx tsc --noEmit`

Expected: no errors related to `groupName` / `actions.ts` / edit page. Fix any type errors introduced by this task before committing.

- [ ] **Step 5: Commit**

```bash
git add app/admin/documents/actions.ts app/admin/documents/[type]/[id]/edit/page.tsx
git commit -m "$(cat <<'EOF'
SCOL-1234 persist sph item groupname

EOF
)"
```

---

### Task 4: Edit form Group field

**Files:**
- Modify: `app/admin/documents/DocumentForm.tsx`

**Interfaces:**
- Consumes: `defaultValue.lines[].groupName`
- Produces: hidden `lines` JSON includes `groupName` for SPH

- [ ] **Step 1: Extend `FormLine` and defaults**

```ts
type FormLine = {
  description: string;
  detail: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxable: boolean;
  groupName: string;
};
```

```ts
function emptyLine(): FormLine {
  return {
    description: "",
    detail: "",
    quantity: 1,
    unit: "pcs",
    unitPrice: 0,
    taxable: true,
    groupName: "",
  };
}
```

Update `DocumentWithLines.lines` element type to include `groupName?: string | null`.

Update initial `useState` map:

```ts
      groupName: line.groupName ?? "",
```

- [ ] **Step 2: Render Group input for SPH only**

Inside each line card, **above** Item Name / Description, when `isSph`:

```tsx
                {isSph && (
                  <div className="mb-3">
                    <Label className="mb-1">Group</Label>
                    <Input
                      placeholder="e.g. SKK, Manufacturing"
                      value={line.groupName}
                      onChange={(event) =>
                        updateLine(index, { groupName: event.target.value })
                      }
                    />
                  </div>
                )}
```

Do not show Group for non-SPH types. Hidden `lines` JSON already stringifies full `lines` state, so `groupName` will submit automatically for SPH.

- [ ] **Step 3: Manual check**

Run: `npm run dev`

Open an SPH edit page: Group field appears above Item Name; save a draft with `Manufacturing` on one item; reload edit page and confirm value restored.

- [ ] **Step 4: Commit**

```bash
git add app/admin/documents/DocumentForm.tsx
git commit -m "$(cat <<'EOF'
SCOL-1234 add sph group field on edit form

EOF
)"
```

---

### Task 5: i18n + preview CSS

**Files:**
- Modify: `lib/document-i18n.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `DocumentStrings.groupSubtotal: (groupName: string) => string`
- Produces: CSS classes `.item-table tr.sph-group-header td`, `.item-table tr.sph-group-subtotal td`

- [ ] **Step 1: Add i18n helper**

On `DocumentStrings` type add:

```ts
  groupSubtotal: (groupName: string) => string;
```

In `sharedEn`:

```ts
  groupSubtotal: (groupName: string) => `Subtotal ${groupName}`,
```

In `sharedId`:

```ts
  groupSubtotal: (groupName: string) => `Subtotal ${groupName}`,
```

(If `sharedEn` / `sharedId` omit function fields via `Omit`, add `groupSubtotal` beside other SPH-specific overrides in `getDocumentStrings` the same way `sphIntroBody` is handled — keep EN/ID returning the same template string shape.)

- [ ] **Step 2: Add CSS**

In `app/globals.css` after `.item-table` rules:

```css
.item-table tr.sph-group-header td {
  background: #2c3e50;
  color: #fff;
  font-weight: 700;
  border-color: #2c3e50;
}

.item-table tr.sph-group-subtotal td {
  background: #eef1f4;
  font-weight: 700;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/document-i18n.ts app/globals.css
git commit -m "$(cat <<'EOF'
SCOL-1234 add sph group preview strings and styles

EOF
)"
```

---

### Task 6: Preview / print grouped table

**Files:**
- Modify: `app/admin/documents/DocumentPreviewView.tsx`

**Interfaces:**
- Consumes: `groupSphItems`, `t.groupSubtotal`
- Produces: SPH tbody renders ungrouped → header → items → subtotal

- [ ] **Step 1: Import helper**

```ts
import { groupSphItems } from "@/lib/sph-item-grouping";
```

- [ ] **Step 2: Replace SPH item body rendering**

Where `lines.map` builds the main item table body, for `type === "SPH"` use grouped rendering instead of the flat map. Keep Surat Jalan / other types unchanged.

Concrete approach inside the existing `<tbody>`:

```tsx
          <tbody>
            {type === "SPH"
              ? (() => {
                  const { ungrouped, groups } = groupSphItems(lines);
                  const colCount = 5;
                  const renderItemRow = (line: (typeof lines)[number]) => {
                    const lineTotal = Number(line.quantity) * Number(line.unitPrice);
                    return (
                      <tr key={line.id}>
                        <td>
                          {renderDescription(type, line.description)}
                          {renderDetail(type, line.detail)}
                        </td>
                        <td className="text-center col-qty">{Number(line.quantity)}</td>
                        <td className="text-center">{line.unit}</td>
                        <td className="text-right">
                          {formatCurrencyAmount(Number(line.unitPrice), locale)}
                        </td>
                        <td className="text-right">
                          {formatCurrencyAmount(lineTotal, locale)}
                        </td>
                      </tr>
                    );
                  };
                  return (
                    <>
                      {ungrouped.map(renderItemRow)}
                      {groups.map((group) => (
                        <Fragment key={`group-${group.name}`}>
                          <tr className="sph-group-header">
                            <td colSpan={colCount}>{group.name}</td>
                          </tr>
                          {group.items.map(renderItemRow)}
                          <tr className="sph-group-subtotal">
                            <td colSpan={4} className="text-right">
                              {t.groupSubtotal(group.name)}
                            </td>
                            <td className="text-right">
                              {formatCurrencyAmount(group.subtotal, locale)}
                            </td>
                          </tr>
                        </Fragment>
                      ))}
                    </>
                  );
                })()
              : lines.map((line, index) => {
                  /* existing non-SPH branch unchanged */
                })}
          </tbody>
```

Add `Fragment` to the React import if not already present.

Document totals block below the table must remain untouched.

- [ ] **Step 3: Manual verify**

Open SPH preview with mixed ungrouped + `Manufacturing` + `SKK` items. Confirm navy headers, gray subtotals, ungrouped first, document totals unchanged. Print preview should match.

- [ ] **Step 4: Commit**

```bash
git add app/admin/documents/DocumentPreviewView.tsx
git commit -m "$(cat <<'EOF'
SCOL-1234 render sph groups in document preview

EOF
)"
```

---

### Task 7: Excel export grouping

**Files:**
- Modify: `lib/sph-excel-export.ts`

**Interfaces:**
- Consumes: `groupSphItems`, `getDocumentStrings(...).groupSubtotal`
- Produces: Excel rows mirror preview structure

- [ ] **Step 1: Import helper**

```ts
import { groupSphItems } from "@/lib/sph-item-grouping";
```

- [ ] **Step 2: Replace flat item loop**

Replace the `for (const line of document.items)` block (~174–204) with:

```ts
  const { ungrouped, groups } = groupSphItems(document.items);

  const writeItemRow = (line: SphItem) => {
    const lineTotal = Number(line.quantity) * Number(line.unitPrice);
    const description = [line.description, line.detail].filter(Boolean).join("\n");
    const itemRow = sheet.getRow(row);
    const values = [
      description,
      Number(line.quantity),
      line.unit || "-",
      formatCurrencyAmount(Number(line.unitPrice), locale),
      formatCurrencyAmount(lineTotal, locale),
    ];
    values.forEach((value, index) => {
      const cell = itemRow.getCell(index + 1);
      cell.value = value;
      cell.alignment = {
        horizontal: index === 0 ? "left" : index >= 3 ? "right" : "center",
        vertical: "top",
        wrapText: index === 0,
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    if (description.includes("\n")) {
      itemRow.height = Math.min(18 * (description.split("\n").length + 1), 72);
    }
    row += 1;
  };

  const writeGroupHeader = (name: string) => {
    sheet.mergeCells(`A${row}:E${row}`);
    const cell = sheet.getCell(`A${row}`);
    cell.value = name;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2C3E50" },
    };
    cell.alignment = { horizontal: "left", vertical: "middle" };
    for (let col = 1; col <= 5; col += 1) {
      sheet.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      sheet.getCell(row, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2C3E50" },
      };
    }
    row += 1;
  };

  const writeGroupSubtotal = (name: string, subtotal: number) => {
    sheet.mergeCells(`A${row}:D${row}`);
    const labelCell = sheet.getCell(`A${row}`);
    labelCell.value = t.groupSubtotal(name);
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF1F4" },
    };
    const amountCell = sheet.getCell(`E${row}`);
    amountCell.value = formatCurrencyAmount(subtotal, locale);
    amountCell.font = { bold: true };
    amountCell.alignment = { horizontal: "right", vertical: "middle" };
    amountCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEEF1F4" },
    };
    for (let col = 1; col <= 5; col += 1) {
      sheet.getCell(row, col).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      sheet.getCell(row, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEF1F4" },
      };
    }
    row += 1;
  };

  for (const line of ungrouped) {
    writeItemRow(line);
  }
  for (const group of groups) {
    writeGroupHeader(group.name);
    for (const line of group.items) {
      writeItemRow(line);
    }
    writeGroupSubtotal(group.name, group.subtotal);
  }
```

Keep the document totals block after this unchanged.

- [ ] **Step 3: Manual verify**

Export Excel for a grouped SPH. Confirm navy header rows, gray subtotals, ungrouped items first, document totals still correct.

- [ ] **Step 4: Commit**

```bash
git add lib/sph-excel-export.ts
git commit -m "$(cat <<'EOF'
SCOL-1234 export sph groups in excel

EOF
)"
```

---

### Task 8: Final verification

**Files:** none new

- [ ] **Step 1: Re-run unit tests**

Run: `npm test`

Expected: PASS

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: PASS

- [ ] **Step 3: End-to-end manual checklist**

1. Create/edit SPH: set Group `Manufacturing` on some items, leave others blank, set `SKK` on others.
2. Save → edit reload shows groups.
3. Preview: ungrouped flat → Manufacturing header/items/subtotal → SKK header/items/subtotal → document totals.
4. Excel download matches preview structure.
5. Duplicate SPH: new draft keeps `groupName` values.
6. Non-SPH document edit: no Group field; save still works.

- [ ] **Step 4: No further commit unless verification required tiny fixes**

If fixes were needed, commit them with `SCOL-1234 fix sph grouping …`.

---

## Spec coverage self-check

| Spec requirement | Task |
| --- | --- |
| `SphItem.groupName` | Task 2 |
| normalize trim / null / max 100 | Task 1 + Task 3 |
| Shared `groupSphItems` | Task 1 |
| Edit form Group field | Task 4 |
| Persist create/update | Task 3 |
| Duplicate copies group | Task 3 |
| Preview navy header + gray subtotal | Task 5 + Task 6 |
| Excel same structure | Task 7 |
| Ungrouped first, first-appearance order | Task 1 tests + Task 6/7 |
| Document totals unchanged | Task 6/7 (explicit non-touch) |
| SPH only | Task 3/4 |
| Unit tests | Task 1 + Task 8 |

## Placeholder / consistency check

- No TBD steps.
- `normalizeGroupName` / `groupSphItems` names consistent across tasks.
- `groupName` field name consistent (schema, form, actions, helper).
- Commit format uses `SCOL-1234` placeholder throughout.
