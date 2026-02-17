import { Link } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";

import { VnumPicker } from "./vnum-picker.tsx";

interface EntityListItem {
  name: string;
  secondary?: string;
  vnum: number;
}

interface EntityListProps {
  basePath: string;
  createPending?: boolean;
  entities: EntityListItem[];
  label: string;
  onCreateVnum?: (vnum: number) => void;
  secondaryLabel?: string;
  vnumBlocks?: Array<{ end: number; start: number }> | undefined;
}

export function EntityList({
  basePath,
  createPending,
  entities,
  label,
  onCreateVnum,
  secondaryLabel,
  vnumBlocks,
}: EntityListProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "vnum">("vnum");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const deferredSearch = useDeferredValue(search);

  const filtered = deferredSearch
    ? entities.filter(
        (e) =>
          e.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          String(e.vnum).includes(deferredSearch),
      )
    : entities;

  const sorted = filtered.toSorted((a, b) => {
    const cmp =
      sortBy === "vnum" ? a.vnum - b.vnum : a.name.localeCompare(b.name);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (col: "name" | "vnum") => {
    if (sortBy === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(col);
      setSortAsc(true);
    }
  };

  const PAGE_SIZE = 50;
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated =
    totalPages > 1
      ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      : sorted;

  const sortIndicator = (col: "name" | "vnum") =>
    sortBy === col ? (sortAsc ? " \u25B2" : " \u25BC") : "";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">
          {label}{" "}
          <span className="text-sm font-normal text-zinc-400">
            ({String(entities.length)})
          </span>
        </h2>
        {onCreateVnum && vnumBlocks ? (
          <VnumPicker
            createPending={createPending}
            existingVnums={new Set(entities.map((e) => e.vnum))}
            onCreate={onCreateVnum}
            onOpenChange={setShowCreate}
            open={showCreate}
            triggerLabel={`New ${label.slice(0, -1)}`}
            vnumBlocks={vnumBlocks}
          />
        ) : null}
      </div>

      <div className="relative mb-4 max-w-md">
        <input
          aria-label="Search by vnum or name"
          className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 pr-8 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Search by vnum or name..."
          type="text"
          value={search}
        />
        {search ? (
          <button
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-200"
            onClick={() => {
              setSearch("");
              setPage(0);
            }}
            type="button"
          >
            {"\u2715"}
          </button>
        ) : null}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700/50 text-left text-zinc-400">
            <th
              className="w-24 px-3 py-2 font-medium"
              scope="col"
            >
              <button
                className="hover:text-zinc-200"
                onClick={() => {
                  toggleSort("vnum");
                }}
                type="button"
              >
                Vnum{sortIndicator("vnum")}
              </button>
            </th>
            <th
              className="px-3 py-2 font-medium"
              scope="col"
            >
              <button
                className="hover:text-zinc-200"
                onClick={() => {
                  toggleSort("name");
                }}
                type="button"
              >
                Name{sortIndicator("name")}
              </button>
            </th>
            {secondaryLabel ? (
              <th
                className="px-3 py-2 font-medium"
                scope="col"
              >
                {secondaryLabel}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {paginated.map((entity) => {
            const to = `${basePath}/${String(entity.vnum)}`;
            return (
              <tr
                className="has-[a:focus-visible]:ring-accent group border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 has-[a:focus-visible]:bg-zinc-800/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset"
                key={entity.vnum}
              >
                <td className="p-0">
                  <Link
                    className="block px-3 py-2 font-mono text-zinc-400 outline-none"
                    to={to}
                  >
                    {entity.vnum}
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    className="block px-3 py-2 text-zinc-200 outline-none group-hover:text-zinc-100"
                    tabIndex={-1}
                    to={to}
                  >
                    {entity.name || "(unnamed)"}
                  </Link>
                </td>
                {secondaryLabel ? (
                  <td className="p-0">
                    <Link
                      className="block px-3 py-2 text-zinc-400 outline-none"
                      tabIndex={-1}
                      to={to}
                    >
                      {entity.secondary ?? ""}
                    </Link>
                  </td>
                ) : null}
              </tr>
            );
          })}
          {paginated.length === 0 ? (
            <tr>
              <td
                className="px-3 py-8 text-center text-zinc-400"
                colSpan={secondaryLabel ? 3 : 2}
              >
                {search ? (
                  "No matches found"
                ) : onCreateVnum && vnumBlocks ? (
                  <span>
                    No {label.toLowerCase()} yet.{" "}
                    <button
                      className="text-accent hover:underline"
                      onClick={() => {
                        setShowCreate(true);
                      }}
                      type="button"
                    >
                      Create your first {label.slice(0, -1).toLowerCase()}
                    </button>
                  </span>
                ) : (
                  `No ${label.toLowerCase()} yet`
                )}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-zinc-400">
          <button
            className="rounded px-3 py-1 hover:bg-zinc-800 disabled:opacity-40"
            disabled={page === 0}
            onClick={() => {
              setPage((p) => p - 1);
            }}
            type="button"
          >
            {"\u2190"} Previous
          </button>
          <span>
            Page {String(page + 1)} of {String(totalPages)}
          </span>
          <button
            className="rounded px-3 py-1 hover:bg-zinc-800 disabled:opacity-40"
            disabled={page >= totalPages - 1}
            onClick={() => {
              setPage((p) => p + 1);
            }}
            type="button"
          >
            Next {"\u2192"}
          </button>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-zinc-400">
        {search
          ? `${String(sorted.length)} results (${String(entities.length)} total)`
          : `${String(entities.length)} ${label.toLowerCase()}`}
      </p>
    </div>
  );
}
