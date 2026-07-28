import {
  appYmdEnd,
  appYmdStart,
  getDefaultSphRangeYmd,
  isAppYmd,
} from "@/lib/datetime";
import { prisma } from "@/lib/prisma";
import { notDeleted } from "@/lib/soft-delete";

export type SphCompanyCount = {
  company: string;
  alias: string | null;
  count: number;
  color: string;
};

export function resolveSphDateRange(input?: {
  from?: string;
  to?: string;
}) {
  const defaults = getDefaultSphRangeYmd();
  let from = isAppYmd(input?.from) ? input.from : defaults.from;
  let to = isAppYmd(input?.to) ? input.to : defaults.to;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return {
    from,
    to,
    fromDate: appYmdStart(from),
    toDate: appYmdEnd(to),
  };
}

function normalizeCompanyKey(value: string) {
  return value.trim().toLowerCase();
}

/** Soft pastel HSL derived from company name (stable per company). */
export function softColorFromKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 42 + (Math.abs(hash) % 18);
  const lightness = 68 + (Math.abs(hash >> 3) % 10);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export async function getSphCountByCompany(range: {
  fromDate: Date;
  toDate: Date;
}): Promise<SphCompanyCount[]> {
  const [rows, companies] = await Promise.all([
    prisma.sph.groupBy({
      by: ["recipientCompany"],
      where: {
        ...notDeleted,
        issueDate: {
          gte: range.fromDate,
          lte: range.toDate,
        },
      },
      _count: { _all: true },
      orderBy: {
        _count: {
          recipientCompany: "desc",
        },
      },
    }),
    prisma.company.findMany({
      where: { deletedAt: null },
      select: { companyName: true, companyAlias: true },
    }),
  ]);

  const aliasByKey = new Map<string, string | null>();
  for (const company of companies) {
    const nameKey = normalizeCompanyKey(company.companyName);
    const alias = company.companyAlias?.trim() || null;
    aliasByKey.set(nameKey, alias);
    if (alias) {
      aliasByKey.set(normalizeCompanyKey(alias), alias);
    }
  }

  return rows
    .map((row) => {
      const company = row.recipientCompany?.trim() || "(No company)";
      const alias =
        company === "(No company)"
          ? null
          : (aliasByKey.get(normalizeCompanyKey(company)) ?? null);
      return {
        company,
        alias,
        count: row._count._all,
        color: softColorFromKey(company),
      };
    })
    .sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
}
