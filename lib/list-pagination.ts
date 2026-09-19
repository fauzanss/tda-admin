export const LIST_PAGE_SIZE = 15;

/** Fetch take+1 rows to detect hasMore, then return only take. */
export function paginateTakePlusOne<T>(rows: T[], take: number): { items: T[]; hasMore: boolean } {
  const hasMore = rows.length > take;
  return {
    items: hasMore ? rows.slice(0, take) : rows,
    hasMore,
  };
}
