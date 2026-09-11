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
