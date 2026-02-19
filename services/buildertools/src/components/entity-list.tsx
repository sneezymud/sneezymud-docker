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
import { FolderOpen, SearchX } from "lucide-react";
import { useDeferredValue, useState } from "react";

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

  // eslint-disable-next-line react-hooks/incompatible-library
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
        String(row.original.vnum).includes(filterValue) ||
        (row.original.secondary?.toLowerCase().includes(searchLower) ?? false)
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
        <h2 className="text-foreground text-2xl font-bold">
          {label}{" "}
          <span className="text-muted-foreground text-sm font-normal">
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

      <div className="relative mb-4 max-w-lg">
        <Input
          aria-label="Search by vnum or name"
          className="pr-8"
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Search by vnum or name..."
          type="text"
          value={search}
        />
        {search ? (
          <Button
            aria-label="Clear search"
            className="absolute top-1/2 right-1 -translate-y-1/2"
            onClick={() => {
              setSearch("");
            }}
            size="icon-xs"
            variant="ghost"
          >
            {"\u2715"}
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={header.column.id === "vnum" ? "w-24" : undefined}
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
          {rows.map((row) => {
            const entity = row.original;
            const to = `${basePath}/${entity.vnum}`;
            return (
              <TableRow
                aria-label={`${entity.name || "(unnamed)"} (vnum ${entity.vnum})`}
                className="has-[a:focus-visible]:ring-accent group hover:bg-muted/50 has-[a:focus-visible]:bg-muted/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset"
                key={entity.vnum}
              >
                <TableCell className="p-0">
                  <Link
                    className="text-muted-foreground block px-2 py-2 font-mono outline-none"
                    to={to}
                  >
                    {entity.vnum}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    className="text-foreground group-hover:text-foreground block px-2 py-2 outline-none"
                    tabIndex={-1}
                    to={to}
                  >
                    {entity.name || "(unnamed)"}
                  </Link>
                </TableCell>
                {secondaryLabel ? (
                  <TableCell className="p-0">
                    <Link
                      className="text-muted-foreground block px-2 py-2 outline-none"
                      tabIndex={-1}
                      to={to}
                    >
                      {entity.secondary ?? ""}
                    </Link>
                  </TableCell>
                ) : null}
              </TableRow>
            );
          })}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-8 text-center"
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
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-4">
        <SearchX className="h-8 w-8 opacity-40" />
        No matches found
      </div>
    );
  }

  if (canCreate) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-4">
        <FolderOpen className="h-8 w-8 opacity-40" />
        <span>
          No {label.toLowerCase()} yet.{" "}
          <Button
            className="h-auto p-0"
            onClick={onShowCreate}
            variant="link"
          >
            Create your first {label.slice(0, -1).toLowerCase()}
          </Button>
        </span>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 py-4">
      <FolderOpen className="h-8 w-8 opacity-40" />
      No {label.toLowerCase()} yet
    </div>
  );
}
