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
