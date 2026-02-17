import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { QueryStatus } from "@/components/query-status.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { zoneKeys } from "@/shared/query-keys.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";

export const Route = createFileRoute("/_authenticated/zones")({
  component: ZonesPage,
});

function ZonesPage() {
  const [search, setSearch] = useState("");

  const {
    data: zones,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: zoneKeys.all,
  });

  if (isLoading || isError || !zones) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="zones"
      />
    );
  }

  const filtered = search
    ? zones.filter(
        (z) =>
          z.zone_name.toLowerCase().includes(search.toLowerCase()) ||
          String(z.zone_nr).includes(search),
      )
    : zones;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-zinc-100">Zones</h2>

      <div className="mb-4 rounded border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 text-sm text-zinc-400">
        Zones are managed in-game. This page is read-only.
      </div>

      <input
        aria-label="Search by number or name"
        className="focus-visible:ring-accent mb-4 w-full max-w-md rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder="Search by number or name..."
        type="text"
        value={search}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700/50 text-left text-zinc-400">
              <th
                className="w-24 px-3 py-2 font-medium"
                scope="col"
              >
                #
              </th>
              <th
                className="px-3 py-2 font-medium"
                scope="col"
              >
                Name
              </th>
              <th
                className="px-3 py-2 font-medium"
                scope="col"
              >
                Range
              </th>
              <th
                className="px-3 py-2 font-medium"
                scope="col"
              >
                Lifespan
              </th>
              <th
                className="px-3 py-2 font-medium"
                scope="col"
              >
                Enabled
              </th>
              <th
                className="px-3 py-2 font-medium"
                scope="col"
              >
                Entities
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((zone) => (
              <tr
                className="border-b border-zinc-800/50 odd:bg-zinc-800/5 hover:bg-zinc-800/20"
                key={zone.zone_nr}
              >
                <td className="px-3 py-2 font-mono text-zinc-400">
                  {zone.zone_nr}
                </td>
                <td className="px-3 py-2 text-zinc-200">{zone.zone_name}</td>
                <td className="px-3 py-2 font-mono text-zinc-400">
                  {zone.bottom != null && zone.top != null
                    ? `${zone.bottom}-${zone.top}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-zinc-400">
                  {zone.lifespan ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {zone.zone_enabled === 1 ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-zinc-400">No</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {zone.bottom != null && zone.top != null ? (
                    <div className="flex gap-2">
                      <Link
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                        search={{ from: zone.bottom, to: zone.top }}
                        to="/rooms"
                      >
                        Rooms
                      </Link>
                      <Link
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                        search={{ from: zone.bottom, to: zone.top }}
                        to="/mobs"
                      >
                        Mobs
                      </Link>
                      <Link
                        className="text-xs text-zinc-400 hover:text-zinc-200"
                        search={{ from: zone.bottom, to: zone.top }}
                        to="/objects"
                      >
                        Objects
                      </Link>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-8 text-center text-zinc-400"
                  colSpan={6}
                >
                  {search ? "No matches found" : "No zones"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-xs text-zinc-400">
        {search
          ? `${filtered.length} results (${zones.length} total)`
          : `${zones.length} zones`}
      </p>
    </div>
  );
}
