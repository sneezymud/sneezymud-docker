import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { QueryStatus } from "@/components/query-status.tsx";
import { apiFetch } from "@/shared/api-client.ts";
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
    queryKey: ["zones"],
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
      <h2 className="mb-4 text-lg font-semibold text-zinc-100">Zones</h2>

      <input
        className="mb-4 w-full max-w-md rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        placeholder="Search by number or name..."
        type="text"
        value={search}
      />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700/50 text-left text-zinc-400">
            <th className="w-24 px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Range</th>
            <th className="px-3 py-2 font-medium">Lifespan</th>
            <th className="px-3 py-2 font-medium">Enabled</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((zone) => (
            <tr
              className="border-b border-zinc-800/50 hover:bg-zinc-800/10"
              key={zone.zone_nr}
            >
              <td className="px-3 py-2 font-mono text-zinc-400">
                {zone.zone_nr}
              </td>
              <td className="px-3 py-2 text-zinc-200">{zone.zone_name}</td>
              <td className="px-3 py-2 font-mono text-zinc-400">
                {zone.bottom != null && zone.top != null
                  ? `${String(zone.bottom)}-${String(zone.top)}`
                  : "—"}
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {zone.lifespan ?? "—"}
              </td>
              <td className="px-3 py-2">
                {zone.zone_enabled === 1 ? (
                  <span className="text-green-400">Yes</span>
                ) : (
                  <span className="text-zinc-500">No</span>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 ? (
            <tr>
              <td
                className="px-3 py-8 text-center text-zinc-500"
                colSpan={5}
              >
                {search ? "No matches found" : "No zones"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <p className="mt-2 text-xs text-zinc-500">
        {search
          ? `${String(filtered.length)} results (${String(zones.length)} total)`
          : `${String(zones.length)} zones`}
      </p>
    </div>
  );
}
