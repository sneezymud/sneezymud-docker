import { Link } from "@tanstack/react-router";
import { type ColumnDef, type Row } from "@tanstack/react-table";
import { FolderOpen, SearchX, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table.tsx";
import { useSearchableTable } from "@/hooks/use-searchable-table.ts";

import { SortableTableHeader } from "./sortable-table-header.tsx";
import { TablePagination } from "./table-pagination.tsx";
import { VnumPicker } from "./vnum-picker.tsx";

interface EntityListItem {
  name: string;
  secondary?: string;
  vnum: number;
}

interface EntityListProps {
  basePath: string;
  createPending?: boolean;
  deletePending?: boolean;
  entities: EntityListItem[];
  label: string;
  onCreateVnum?: (vnum: number) => void;
  onDeleteSelected?: (vnums: number[]) => void;
  secondaryLabel?: string;
  vnumBlocks?: Array<{ end: number; start: number }> | undefined;
}

export function EntityList({
  basePath,
  createPending,
  deletePending,
  entities,
  label,
  onCreateVnum,
  onDeleteSelected,
  secondaryLabel,
  vnumBlocks,
}: EntityListProps) {
  const [showCreate, setShowCreate] = useState(false);

  const selectable = Boolean(onDeleteSelected);
  const columns = buildColumns(selectable, secondaryLabel);

  const {
    filteredCount,
    pageIndex,
    rows,
    rowSelection,
    search,
    setSearch,
    table,
    totalPages,
  } = useSearchableTable({
    columns,
    data: entities,
    defaultSort: [{ desc: false, id: "vnum" }],
    enableRowSelection: selectable,
    getRowId: (row) => String(row.vnum),
    globalFilterFn: (row, _, filterValue) => {
      const searchLower = filterValue.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(searchLower) ||
        String(row.original.vnum).includes(filterValue) ||
        (row.original.secondary?.toLowerCase().includes(searchLower) ?? false)
      );
    },
  });

  const selectedVnums = Object.keys(rowSelection).map(Number);

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
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

      <EntityListToolbar
        deletePending={deletePending}
        onDelete={
          onDeleteSelected
            ? () => {
                onDeleteSelected(selectedVnums);
              }
            : undefined
        }
        search={search}
        selectedCount={selectedVnums.length}
        setSearch={setSearch}
      />

      <Table>
        <SortableTableHeader
          columnClassName={(id) =>
            id === "select"
              ? "w-10"
              : id === "vnum"
                ? "w-24"
                : id === "secondary"
                  ? "hidden sm:table-cell"
                  : undefined
          }
          headerGroups={table.getHeaderGroups()}
        />

        <TableBody>
          {rows.map((row) => (
            <EntityRow
              basePath={basePath}
              key={row.original.vnum}
              row={row}
              secondaryLabel={secondaryLabel}
              selectable={selectable}
            />
          ))}

          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-8 text-center"
                colSpan={columns.length}
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
          ? `${filteredCount} results (${entities.length} total)`
          : `${entities.length} ${label.toLowerCase()}`}
      </p>
    </>
  );
}

function buildColumns(
  selectable: boolean,
  secondaryLabel?: string,
): Array<ColumnDef<EntityListItem>> {
  const columns: Array<ColumnDef<EntityListItem>> = [];

  if (selectable) {
    columns.push({
      enableSorting: false,
      header: ({ table: t }) => (
        <Checkbox
          aria-label="Select all on this page"
          checked={
            t.getIsAllPageRowsSelected()
              ? true
              : t.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(checked) => {
            t.toggleAllPageRowsSelected(checked === true);
          }}
        />
      ),
      id: "select",
    });
  }

  columns.push(
    { accessorKey: "vnum", header: "Vnum" },
    { accessorKey: "name", header: "Name", sortingFn: "text" },
  );

  if (secondaryLabel) {
    columns.push({
      accessorKey: "secondary",
      enableSorting: false,
      header: secondaryLabel,
    });
  }

  return columns;
}

function EntityListToolbar({
  deletePending,
  onDelete,
  search,
  selectedCount,
  setSearch,
}: {
  deletePending?: boolean | undefined;
  onDelete?: (() => void) | undefined;
  search: string;
  selectedCount: number;
  setSearch: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="relative max-w-lg flex-1">
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

      {onDelete && selectedCount > 0 ? (
        <Button
          disabled={deletePending}
          onClick={onDelete}
          size="sm"
          variant="destructive"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete {selectedCount}
        </Button>
      ) : null}
    </div>
  );
}

function EntityRow({
  basePath,
  row,
  secondaryLabel,
  selectable,
}: {
  basePath: string;
  row: Row<EntityListItem>;
  secondaryLabel?: string | undefined;
  selectable: boolean;
}) {
  const entity = row.original;
  const to = `${basePath}/${entity.vnum}`;
  return (
    <TableRow
      aria-label={`${entity.name || "(unnamed)"} (vnum ${entity.vnum})`}
      className="has-[a:focus-visible]:ring-accent group hover:bg-muted/50 has-[a:focus-visible]:bg-muted/30 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset"
    >
      {selectable ? (
        <TableCell
          className="px-2 py-2.5"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Checkbox
            aria-label={`Select ${entity.name || entity.vnum}`}
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => {
              row.toggleSelected(checked === true);
            }}
          />
        </TableCell>
      ) : null}

      <TableCell className="p-0">
        <Link
          className="text-accent hover:text-accent/80 block px-2 py-2.5 font-mono outline-none"
          to={to}
        >
          {entity.vnum}
        </Link>
      </TableCell>

      <TableCell className="p-0">
        <Link
          className="text-foreground group-hover:text-foreground block px-2 py-2.5 outline-none"
          tabIndex={-1}
          to={to}
        >
          {entity.name || "(unnamed)"}
        </Link>
      </TableCell>

      {secondaryLabel ? (
        <TableCell className="hidden p-0 sm:table-cell">
          <Link
            className="text-muted-foreground block px-2 py-2.5 outline-none"
            tabIndex={-1}
            to={to}
          >
            {entity.secondary ?? ""}
          </Link>
        </TableCell>
      ) : null}
    </TableRow>
  );
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
