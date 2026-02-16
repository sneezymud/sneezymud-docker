import { Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import { Z_DROPDOWN } from "./styles.ts";

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

interface VnumPickerProps {
  createPending?: boolean | undefined;
  existingVnums: Set<number>;
  onClose: () => void;
  onCreate: (vnum: number) => void;
  vnumBlocks: Array<{ end: number; start: number }>;
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
        {onCreateVnum ? (
          <div className="relative">
            <button
              aria-controls={showCreate ? "vnum-picker" : undefined}
              aria-expanded={showCreate}
              className="focus-visible:ring-accent rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 active:scale-[0.98]"
              onClick={() => {
                setShowCreate((prev) => !prev);
              }}
              type="button"
            >
              New {label.slice(0, -1)}
            </button>
            {showCreate && vnumBlocks ? (
              <VnumPicker
                createPending={createPending}
                existingVnums={new Set(entities.map((e) => e.vnum))}
                onClose={() => {
                  setShowCreate(false);
                }}
                onCreate={(vnum) => {
                  onCreateVnum(vnum);
                  setShowCreate(false);
                }}
                vnumBlocks={vnumBlocks}
              />
            ) : null}
          </div>
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
                ) : onCreateVnum ? (
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

function VnumPicker({
  createPending,
  existingVnums,
  onClose,
  onCreate,
  vnumBlocks,
}: VnumPickerProps) {
  // Find next available vnum
  let suggestedVnum: null | number = null;
  for (const block of vnumBlocks) {
    for (let v = block.start; v <= block.end; v++) {
      if (!existingVnums.has(v)) {
        suggestedVnum = v;
        break;
      }
    }
    if (suggestedVnum !== null) {
      break;
    }
  }

  const [vnumInput, setVnumInput] = useState(
    suggestedVnum === null ? "" : String(suggestedVnum),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const vnumInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    vnumInputRef.current?.focus();
  }, []);

  // Click-outside-to-dismiss
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [onClose]);

  const vnumNumber = Number(vnumInput);
  const isValid =
    vnumInput !== "" &&
    Number.isInteger(vnumNumber) &&
    vnumBlocks.some((b) => vnumNumber >= b.start && vnumNumber <= b.end) &&
    !existingVnums.has(vnumNumber);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isValid) {
      onCreate(vnumNumber);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => {
      globalThis.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      className={`absolute top-full right-0 ${Z_DROPDOWN} mt-2 w-80 rounded border border-zinc-700 bg-zinc-800 p-4 shadow-lg`}
      id="vnum-picker"
      ref={containerRef}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Create at vnum</h3>
        <button
          className="focus-visible:ring-accent text-xs text-zinc-400 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          onClick={onClose}
          type="button"
        >
          Cancel
        </button>
      </div>

      <form
        className="flex items-end gap-3"
        onSubmit={handleSubmit}
      >
        <div className="flex-1">
          <input
            className="focus-visible:ring-accent w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
            onChange={(e) => {
              setVnumInput(e.target.value);
            }}
            placeholder={
              suggestedVnum === null
                ? "Enter vnum"
                : `Next available: ${String(suggestedVnum)}`
            }
            ref={vnumInputRef}
            type="number"
            value={vnumInput}
          />
          <p className="mt-1 text-xs text-zinc-400">
            Ranges:{" "}
            {vnumBlocks
              .map((b) => `${String(b.start)}-${String(b.end)}`)
              .join(", ")}
          </p>
        </div>
        <button
          className="focus-visible:ring-accent rounded bg-zinc-600 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-500 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:opacity-50"
          disabled={!isValid || createPending}
          type="submit"
        >
          {createPending ? "Creating..." : "Create"}
        </button>
      </form>

      {vnumInput !== "" && !isValid ? (
        <p className="mt-2 text-xs text-red-400">
          {existingVnums.has(vnumNumber)
            ? "Already exists"
            : "Outside your assigned blocks"}
        </p>
      ) : null}
    </div>
  );
}
