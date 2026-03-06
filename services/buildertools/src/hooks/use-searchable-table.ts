import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useDeferredValue, useState } from "react";

export function useSearchableTable<TData>({
  columns,
  data,
  defaultSort,
  enableRowSelection = false,
  getRowId,
  globalFilterFn,
}: {
  columns: Array<ColumnDef<TData>>;
  data: TData[];
  defaultSort: SortingState;
  enableRowSelection?: boolean | undefined;
  getRowId?: ((row: TData) => string) | undefined;
  globalFilterFn: (
    row: Row<TData>,
    columnId: string,
    filterValue: string,
  ) => boolean;
}) {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>(defaultSort);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const deferredSearch = useDeferredValue(search);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    enableRowSelection,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    ...(getRowId ? { getRowId } : {}),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn,
    initialState: {
      pagination: { pageSize: 50 },
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    state: {
      globalFilter: deferredSearch,
      rowSelection,
      sorting,
    },
  });

  return {
    filteredCount: table.getFilteredRowModel().rows.length,
    pageIndex: table.getState().pagination.pageIndex,
    rows: table.getRowModel().rows,
    rowSelection,
    search,
    setSearch,
    table,
    totalPages: table.getPageCount(),
  };
}
