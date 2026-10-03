import { AnyColumn, SQLWrapper } from 'drizzle-orm';

export const sortColumns = <T extends Record<string, string>>(
  sortableColumns: T,
  filters: { orderBy: string; direction: 'asc' | 'desc' },
  fallback: string
) => {
  type SortableColumn = keyof T;

  const isSortableColumn = (
    value: string
  ): value is Extract<SortableColumn, string> => value in sortableColumns;

  const selectedColumn = isSortableColumn(filters.orderBy)
    ? sortableColumns[filters.orderBy as SortableColumn]
    : fallback;

  return selectedColumn;
};

type Sortable = AnyColumn | SQLWrapper;
export const sortColumnsViaSQLJoin = (
  sortableColumns: Record<string, Sortable>,
  filters: { orderBy: string },
  fallback: Sortable
) => {
  type SortKey = keyof typeof sortableColumns;
  const isSortKey = (value: unknown): value is SortKey => {
    return typeof value === 'string' && Object.hasOwn(sortableColumns, value);
  };

  const selectedColumn = isSortKey(filters.orderBy)
    ? sortableColumns[filters.orderBy]
    : fallback;

  return selectedColumn;
};
