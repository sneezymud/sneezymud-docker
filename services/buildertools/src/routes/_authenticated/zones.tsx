import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useDeferredValue, useState } from "react";

import type { Zone } from "@/shared/schemas/zone.ts";

import { QueryStatus } from "@/components/query-status.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { zoneKeys } from "@/shared/query-keys.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";

export const Route = createFileRoute("/_authenticated/zones")({
  component: ZonesPage,
});

const PAGE_SIZE = 50;

const columns: Array<ColumnDef<Zone>> = [
  { accessorKey: "zone_nr", header: "#" },
  { accessorKey: "zone_name", header: "Name", sortingFn: "text" },
  {
    accessorFn: (zone) =>
      zone.bottom != null && zone.top != null
        ? `${zone.bottom}-${zone.top}`
        : "\u2014",
    enableSorting: false,
    header: "Range",
    id: "range",
  },
  {
    accessorKey: "lifespan",
    cell: ({ getValue }) => getValue<null | number>() ?? "\u2014",
    header: "Lifespan",
  },
  {
    accessorKey: "zone_enabled",
    cell: ({ getValue }) =>
      getValue<null | number>() === 1 ? (
        <Badge variant="outline">Yes</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      ),
    header: "Enabled",
  },
  {
    cell: ({ row }) => {
      const zone = row.original;
      if (zone.bottom == null || zone.top == null) return "\u2014";
      return (
        <div className="flex gap-2">
          <Button
            asChild
            className="h-auto p-0"
            variant="link"
          >
            <Link
              search={{ from: zone.bottom, to: zone.top }}
              to="/rooms"
            >
              Rooms
            </Link>
          </Button>
          <Button
            asChild
            className="h-auto p-0"
            variant="link"
          >
            <Link
              search={{ from: zone.bottom, to: zone.top }}
              to="/mobs"
            >
              Mobs
            </Link>
          </Button>
          <Button
            asChild
            className="h-auto p-0"
            variant="link"
          >
            <Link
              search={{ from: zone.bottom, to: zone.top }}
              to="/objects"
            >
              Objects
            </Link>
          </Button>
        </div>
      );
    },
    enableSorting: false,
    header: "Entities",
    id: "entities",
  },
];

function sortIndicator(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return " \u25B2";
  if (sorted === "desc") return " \u25BC";
  return "";
}

function ZonesPage() {
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { desc: false, id: "zone_nr" },
  ]);

  const deferredSearch = useDeferredValue(search);

  const {
    data: zones,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: zoneKeys.all,
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data: zones ?? [],
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const searchLower = filterValue.toLowerCase();
      return (
        row.original.zone_name.toLowerCase().includes(searchLower) ||
        String(row.original.zone_nr).includes(filterValue)
      );
    },
    initialState: {
      pagination: { pageSize: PAGE_SIZE },
    },
    onSortingChange: setSorting,
    state: {
      globalFilter: deferredSearch,
      sorting,
    },
  });

  if (isLoading || isError) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="zones"
      />
    );
  }

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div>
      <h2 className="text-foreground mb-4 text-2xl font-bold">Zones</h2>

      <Alert className="border-l-accent mb-4 border-l-4">
        <AlertDescription>
          Zones are managed in-game. This page is read-only.
        </AlertDescription>
      </Alert>

      <Input
        aria-label="Search by number or name"
        className="mb-4 max-w-lg"
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder="Search by number or name..."
        type="text"
        value={search}
      />

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={
                    header.column.id === "zone_nr" ? "w-24" : undefined
                  }
                  key={header.id}
                >
                  {header.column.getCanSort() ? (
                    <Button
                      className="h-auto p-0"
                      onClick={header.column.getToggleSortingHandler()}
                      variant="ghost"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sortIndicator(header.column.getIsSorted())}
                    </Button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.original.zone_nr}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  className={
                    cell.column.id === "zone_nr"
                      ? "text-muted-foreground font-mono"
                      : cell.column.id === "range"
                        ? "text-muted-foreground font-mono"
                        : cell.column.id === "lifespan"
                          ? "text-muted-foreground"
                          : undefined
                  }
                  key={cell.id}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-8 text-center"
                colSpan={columns.length}
              >
                {search ? "No matches found" : "No zones"}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {totalPages > 1 ? (
        <Pagination className="mt-3">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-disabled={!table.getCanPreviousPage()}
                className={
                  table.getCanPreviousPage()
                    ? "cursor-pointer"
                    : "pointer-events-none opacity-50"
                }
                onClick={() => {
                  table.previousPage();
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground text-sm">
                Page {pageIndex + 1} of {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                aria-disabled={!table.getCanNextPage()}
                className={
                  table.getCanNextPage()
                    ? "cursor-pointer"
                    : "pointer-events-none opacity-50"
                }
                onClick={() => {
                  table.nextPage();
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <p className="text-muted-foreground mt-2 text-xs">
        {search
          ? `${filteredCount} results (${(zones ?? []).length} total)`
          : `${(zones ?? []).length} zones`}
      </p>
    </div>
  );
}
