import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

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
import {
  type Column,
  numericSort,
  textSort,
  useSearchableTable,
} from "@/hooks/use-searchable-table.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { zoneKeys } from "@/shared/query-keys.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";

export const Route = createFileRoute("/_authenticated/zones")({
  component: ZonesPage,
});

const columns: Array<Column<Zone>> = [
  {
    compare: numericSort("zone_nr"),
    header: "#",
    id: "zone_nr",
    render: (z) => z.zone_nr,
  },
  {
    compare: textSort("zone_name"),
    header: "Name",
    id: "zone_name",
    render: (z) => z.zone_name,
  },
  {
    header: "Range",
    id: "range",
    render: (zone) =>
      zone.bottom != null && zone.top != null
        ? `${zone.bottom}-${zone.top}`
        : "\u2014",
  },
  {
    compare: numericSort("lifespan"),
    header: "Lifespan",
    id: "lifespan",
    render: (zone) => zone.lifespan ?? "\u2014",
  },
  {
    compare: numericSort("zone_enabled"),
    header: "Enabled",
    id: "zone_enabled",
    render: (zone) =>
      zone.zone_enabled === 1 ? (
        <Badge variant="outline">Yes</Badge>
      ) : (
        <Badge variant="secondary">No</Badge>
      ),
  },
  {
    header: "Entities",
    id: "entities",
    render: (zone) => {
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
    canNextPage,
    canPreviousPage,
    filteredCount,
    nextPage,
    pageIndex,
    previousPage,
    rows,
    search,
    setSearch,
    sorting,
    toggleSort,
    totalPages,
  } = useSearchableTable({
    columns,
    data: zones ?? [],
    defaultSort: { desc: false, id: "zone_nr" },
    filterFn: (zone, search) => {
      const searchLower = search.toLowerCase();
      return (
        zone.zone_name.toLowerCase().includes(searchLower) ||
        String(zone.zone_nr).includes(search)
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
    <>
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
        <SortableTableHeader
          columnClassName={(id) => (id === "zone_nr" ? "w-24" : undefined)}
          columns={columns}
          onToggleSort={toggleSort}
          sorting={sorting}
        />

        <TableBody>
          {rows.map((zone) => (
            <TableRow key={zone.zone_nr}>
              {columns.map((col) => (
                <TableCell
                  className={
                    col.id === "zone_nr" || col.id === "range"
                      ? "text-muted-foreground font-mono"
                      : col.id === "lifespan"
                        ? "text-muted-foreground"
                        : undefined
                  }
                  key={col.id}
                >
                  {col.render?.(zone)}
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
        canNextPage={canNextPage}
        canPreviousPage={canPreviousPage}
        onNextPage={nextPage}
        onPreviousPage={previousPage}
        pageIndex={pageIndex}
        totalPages={totalPages}
      />

      <p className="text-muted-foreground mt-2 text-xs">
        {search
          ? `${filteredCount} results (${(zones ?? []).length} total)`
          : `${(zones ?? []).length} zones`}
      </p>
    </>
  );
}
