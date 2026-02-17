import { Link } from "@tanstack/react-router";
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

const PAGE_SIZE = 50;

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
  const [sorting, setSorting] = useState<SortingState>([
    { desc: false, id: "vnum" },
  ]);

  const deferredSearch = useDeferredValue(search);

  const columns: Array<ColumnDef<EntityListItem>> = [
    { accessorKey: "vnum", header: "Vnum" },
    { accessorKey: "name", header: "Name", sortingFn: "text" },
  ];

  if (secondaryLabel) {
    columns.push({
      accessorKey: "secondary",
      enableSorting: false,
      header: secondaryLabel,
    });
  }

  const table = useReactTable({
    columns,
    data: entities,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const searchLower = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(searchLower) ||
        String(row.original.vnum).includes(filterValue)
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

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalPages = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">
          {label}{" "}
          <span className="text-sm font-normal text-zinc-400">
            ({entities.length})
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
            }}
            type="button"
          >
            {"\u2715"}
          </button>
        ) : null}
      </div>

      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="border-b border-zinc-700/50 text-left text-zinc-400"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <th
                  className={
                    header.column.id === "vnum"
                      ? "w-24 px-3 py-2 font-medium"
                      : "px-3 py-2 font-medium"
                  }
                  key={header.id}
                  scope="col"
                >
                  {header.column.getCanSort() ? (
                    <button
                      className="hover:text-zinc-200"
                      onClick={header.column.getToggleSortingHandler()}
                      type="button"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {sortIndicator(header.column.getIsSorted())}
                    </button>
                  ) : (
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.map((row) => {
            const entity = row.original;
            const to = `${basePath}/${entity.vnum}`;
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
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-3 py-8 text-center text-zinc-400"
                colSpan={secondaryLabel ? 3 : 2}
              >
                <EmptyMessage
                  canCreate={Boolean(onCreateVnum && vnumBlocks)}
                  label={label}
                  onShowCreate={() => {
                    setShowCreate(true);
                  }}
                  searching={search !== ""}
                />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-zinc-400">
          <button
            className="rounded px-3 py-1 hover:bg-zinc-800 disabled:opacity-40"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
            type="button"
          >
            {"\u2190"} Previous
          </button>
          <span>
            Page {pageIndex + 1} of {totalPages}
          </span>
          <button
            className="rounded px-3 py-1 hover:bg-zinc-800 disabled:opacity-40"
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
            }}
            type="button"
          >
            Next {"\u2192"}
          </button>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-zinc-400">
        {search
          ? `${filteredCount} results (${entities.length} total)`
          : `${entities.length} ${label.toLowerCase()}`}
      </p>
    </div>
  );
}

function sortIndicator(sorted: "asc" | "desc" | false): string {
  if (sorted === "asc") return " \u25B2";
  if (sorted === "desc") return " \u25BC";
  return "";
}

function EmptyMessage({
  canCreate,
  label,
  onShowCreate,
  searching,
}: {
  canCreate: boolean;
  label: string;
  onShowCreate: () => void;
  searching: boolean;
}) {
  if (searching) {
    return <>No matches found</>;
  }

  if (canCreate) {
    return (
      <span>
        No {label.toLowerCase()} yet.{" "}
        <button
          className="text-accent hover:underline"
          onClick={onShowCreate}
          type="button"
        >
          Create your first {label.slice(0, -1).toLowerCase()}
        </button>
      </span>
    );
  }

  return <>No {label.toLowerCase()} yet</>;
}
