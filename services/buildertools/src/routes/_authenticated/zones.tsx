import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { Zone } from "@/shared/schemas/zone.ts";

import { MobileMenuButton } from "@/components/mobile-menu-button.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { TablePagination } from "@/components/table-pagination.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  type Column,
  numericSort,
  textSort,
  useSearchableTable,
} from "@/hooks/use-searchable-table.ts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/shared/api-client.ts";
import { zoneKeys } from "@/shared/query-keys.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";

export const Route = createFileRoute("/_authenticated/zones")({
  component: ZonesPage,
});

const columns: Array<Column<Zone>> = [
  { compare: numericSort("zone_nr"), header: "#", id: "zone_nr" },
  { compare: textSort("zone_name"), header: "Name", id: "zone_name" },
  { compare: numericSort("lifespan"), header: "Lifespan", id: "lifespan" },
  {
    compare: numericSort("zone_enabled"),
    header: "Enabled",
    id: "zone_enabled",
  },
];

function parseZoneName(name: string): {
  author: null | string;
  displayName: string;
} {
  // Split on " - ", "- ", or " -" but not bare "-" (which appears in zone names like "Brazzed-Dum")
  const match = / - |- | -/.exec(name);
  if (match?.index === undefined) return { author: null, displayName: name };
  return {
    author: name.slice(0, match.index),
    displayName: name.slice(match.index + match[0].length),
  };
}

function ZoneRow({
  expanded,
  onToggle,
  zone,
}: {
  expanded: boolean;
  onToggle: () => void;
  zone: Zone;
}) {
  const { author, displayName } = parseZoneName(zone.zone_name);
  const range =
    zone.bottom != null && zone.top != null
      ? `${zone.bottom}\u2013${zone.top}`
      : "\u2014";

  return (
    <div>
      <button
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground flex gap-2 font-mono text-xs">
            <span>#{zone.zone_nr}</span>
            <span>{range}</span>
          </div>

          <div className="text-foreground text-sm">{displayName}</div>
        </div>

        <ChevronDown
          className={cn(
            "text-muted-foreground mt-1 size-4 shrink-0 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="bg-muted/50 flex flex-col gap-2 px-3 pt-1 pb-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {author && (
              <span className="text-muted-foreground">Author: {author}</span>
            )}

            <span className="text-muted-foreground">
              Lifespan: {zone.lifespan ?? "\u2014"}
            </span>

            {zone.zone_enabled === 1 ? (
              <Badge variant="outline">Enabled</Badge>
            ) : (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </div>

          {zone.bottom != null && zone.top != null && (
            <div className="flex gap-3">
              <Button
                asChild
                className="text-accent h-auto p-0 text-xs"
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
                className="text-accent h-auto p-0 text-xs"
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
                className="text-accent h-auto p-0 text-xs"
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
          )}
        </div>
      )}
    </div>
  );
}

function ZonesPage() {
  const [expandedZone, setExpandedZone] = useState<null | number>(null);

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
      <div className="mb-4 flex items-center">
        <h2 className="text-foreground text-2xl font-bold">Zones</h2>

        <div className="ml-auto">
          <MobileMenuButton />
        </div>
      </div>

      <Alert className="border-l-accent mb-4 border-l-4">
        <AlertDescription>
          Read-only. The game server reads zonefiles from disk on each boot and
          writes the metadata to the database.
        </AlertDescription>
      </Alert>

      <Input
        aria-label="Search by number or name"
        className="mb-4"
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder="Search by number or name..."
        type="text"
        value={search}
      />

      <div className="divide-border/70 divide-y">
        {rows.map((zone) => (
          <ZoneRow
            expanded={expandedZone === zone.zone_nr}
            key={zone.zone_nr}
            onToggle={() => {
              setExpandedZone((prev) =>
                prev === zone.zone_nr ? null : zone.zone_nr,
              );
            }}
            zone={zone}
          />
        ))}

        {rows.length === 0 && (
          <div className="py-8 text-center text-sm">
            {search ? "No matches found" : "No zones"}
          </div>
        )}
      </div>

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
