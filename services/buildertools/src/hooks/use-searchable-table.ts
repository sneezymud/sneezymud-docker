import { useDeferredValue, useState } from "react";

export interface Column<T> {
  compare?: (a: T, b: T) => number;
  header: string;
  id: string;
  render?: (row: T) => React.ReactNode;
}

export interface SortState {
  desc: boolean;
  id: string;
}

export function numericSort<T>(key: keyof T & string): (a: T, b: T) => number {
  return (a, b) => Number(a[key]) - Number(b[key]);
}

export function textSort<T>(key: keyof T & string): (a: T, b: T) => number {
  return (a, b) => String(a[key]).localeCompare(String(b[key]));
}

export function useSearchableTable<T>({
  columns,
  data,
  defaultSort,
  filterFn,
  getRowId,
  pageSize = 50,
}: {
  columns: Array<Column<T>>;
  data: T[];
  defaultSort: SortState;
  filterFn: (item: T, search: string) => boolean;
  getRowId?: ((row: T) => string) | undefined;
  pageSize?: number | undefined;
}) {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortState>(defaultSort);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [pageIndex, setPageIndex] = useState(0);
  const deferredSearch = useDeferredValue(search);

  const filtered = deferredSearch
    ? data.filter((item) => filterFn(item, deferredSearch))
    : data;

  const col = columns.find((c) => c.id === sorting.id);
  const compareFn = col?.compare;
  const sorted = compareFn
    ? filtered.toSorted(sorting.desc ? (a, b) => compareFn(b, a) : compareFn)
    : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(pageIndex, totalPages - 1);
  const rows = sorted.slice(
    clampedPage * pageSize,
    (clampedPage + 1) * pageSize,
  );

  const canPreviousPage = clampedPage > 0;
  const canNextPage = clampedPage < totalPages - 1;

  return {
    canNextPage,
    canPreviousPage,
    filteredCount: filtered.length,
    nextPage: () => {
      setPageIndex((p) => Math.min(p + 1, totalPages - 1));
    },
    pageIndex: clampedPage,
    previousPage: () => {
      setPageIndex((p) => Math.max(p - 1, 0));
    },
    rows,
    search,
    selectedIds,
    setSearch: (value: string) => {
      setSearch(value);
      setPageIndex(0);
    },
    sorting,
    toggleAllPageSelected: (selected: boolean) => {
      if (!getRowId) return;
      if (selected) {
        setSelectedIds((prev) => {
          const next = { ...prev };
          for (const row of rows) {
            next[getRowId(row)] = true;
          }
          return next;
        });
      } else {
        const pageIds = new Set(rows.map((row) => getRowId(row)));
        setSelectedIds((prev) => {
          const next: Record<string, boolean> = {};
          for (const [id, v] of Object.entries(prev)) {
            if (!pageIds.has(id)) next[id] = v;
          }
          return next;
        });
      }
    },
    toggleSelected: (id: string, selected: boolean) => {
      setSelectedIds((prev) => {
        if (selected) return { ...prev, [id]: true };
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },
    toggleSort: (id: string) => {
      setSorting((prev) => ({
        desc: prev.id === id ? !prev.desc : false,
        id,
      }));
      setPageIndex(0);
    },
    totalPages,
  };
}
