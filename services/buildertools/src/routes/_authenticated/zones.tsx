import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ColumnDef, flexRender } from "@tanstack/react-table";

import type { Zone } from "@/shared/schemas/zone.ts";

import { QueryStatus } from "@/components/query-status.tsx";
import { SortableTableHeader } from "@/components/sortable-table-header.tsx";
import { TablePagination } from "@/components/table-pagination.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table.tsx";
import { useSearchableTable } from "@/hooks/use-searchable-table.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { zoneKeys } from "@/shared/query-keys.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";

export const Route = createFileRoute("/_authenticated/zones")({
  component: ZonesPage,
});

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

function ZonesPage() {
  const {
    data: zones,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: zoneKeys.all,
  });

  const {
    filteredCount,
    pageIndex,
    rows,
    search,
    setSearch,
    table,
    totalPages,
  } = useSearchableTable({
    columns,
    data: zones ?? [],
    defaultSort: [{ desc: false, id: "zone_nr" }],
    globalFilterFn: (row, _, filterValue) => {
      const searchLower = filterValue.toLowerCase();
      return (
        row.original.zone_name.toLowerCase().includes(searchLower) ||
        String(row.original.zone_nr).includes(filterValue)
      );
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

  return (
    <div>
      <h2 className="text-foreground mb-4 text-2xl font-bold">
        Zones{" "}
        <span className="text-muted-foreground text-sm font-normal">
          ({(zones ?? []).length})
        </span>
      </h2>

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
        <SortableTableHeader
          columnClassName={(id) => (id === "zone_nr" ? "w-24" : undefined)}
          headerGroups={table.getHeaderGroups()}
        />
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

      <TablePagination
        canNextPage={table.getCanNextPage()}
        canPreviousPage={table.getCanPreviousPage()}
        onNextPage={() => {
          table.nextPage();
        }}
        onPreviousPage={() => {
          table.previousPage();
        }}
        pageIndex={pageIndex}
        totalPages={totalPages}
      />

      <p className="text-muted-foreground mt-2 text-xs">
        {search
          ? `${filteredCount} results (${(zones ?? []).length} total)`
          : `${(zones ?? []).length} zones`}
      </p>
    </div>
  );
}
