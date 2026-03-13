import { Link } from "@tanstack/react-router";
import {
  FolderOpen,
  LayoutGrid,
  LayoutList,
  SearchX,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { MobileMenuButton } from "@/components/mobile-menu-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
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

import { SearchInput } from "./search-input.tsx";
import { SortableTableHeader } from "./sortable-table-header.tsx";
import { TablePagination } from "./table-pagination.tsx";
import { VnumPicker } from "./vnum-picker.tsx";

type ListViewMode = "card" | "table";

function isListViewMode(value: null | string): value is ListViewMode {
  return value === "card" || value === "table";
}

function useListViewMode(): [ListViewMode, (mode: ListViewMode) => void] {
  const [mode, setModeInternal] = useState<ListViewMode>(() => {
    try {
      const stored = localStorage.getItem("bt-list-view");
      return isListViewMode(stored) ? stored : "table";
    } catch {
      return "table";
    }
  });
  const setMode = (m: ListViewMode) => {
    setModeInternal(m);
    try {
      localStorage.setItem("bt-list-view", m);
    } catch {
      // localStorage unavailable
    }
  };
  return [mode, setMode];
}

const COLUMN_WIDTHS: Record<string, string> = {
  secondary: "hidden",
  select: "w-10",
  vnum: "w-24",
};

interface EntityListItem {
  metadata?: string;
  name: string;
  secondary?: string;
  vnum: number;
}

interface EntityListProps {
  accentColor?: string;
  allowAnyVnum?: boolean;
  banner?: React.ReactNode;
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
  accentColor,
  allowAnyVnum,
  banner,
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
  const [viewMode, setViewMode] = useListViewMode();

  const selectable = Boolean(onDeleteSelected);
  const columns = buildColumns(selectable, secondaryLabel);

  const {
    canNextPage,
    canPreviousPage,
    filteredCount,
    nextPage,
    pageIndex,
    previousPage,
    rows,
    search,
    selectedIds,
    setSearch,
    sorting,
    toggleAllPageSelected,
    toggleSelected,
    toggleSort,
    totalPages,
  } = useSearchableTable({
    columns,
    data: entities,
    defaultSort: { desc: false, id: "vnum" },
    filterFn: matchEntity,
    getRowId: (row) => String(row.vnum),
  });

  const selectedVnums = entities
    .filter((e) => selectedIds[String(e.vnum)])
    .map((e) => e.vnum);
  const canCreate = Boolean(onCreateVnum && vnumBlocks);
  const searching = search !== "";

  return (
    <>
      <div className="mb-4 flex items-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight">
          {label}
        </h2>

        <div className="ml-auto">
          <MobileMenuButton />
        </div>
      </div>

      {banner}

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          className="min-w-0 flex-1"
          onChange={setSearch}
          placeholder="Search by vnum or name..."
          value={search}
        />

        <Button
          aria-label={
            viewMode === "table"
              ? "Switch to card view"
              : "Switch to table view"
          }
          onClick={() => {
            setViewMode(viewMode === "table" ? "card" : "table");
          }}
          size="icon-sm"
          variant="ghost"
        >
          {viewMode === "table" ? (
            <LayoutGrid className="h-4 w-4" />
          ) : (
            <LayoutList className="h-4 w-4" />
          )}
        </Button>

        {onCreateVnum && vnumBlocks ? (
          <VnumPicker
            allowAnyVnum={allowAnyVnum}
            createPending={createPending}
            existingVnums={new Set(entities.map((e) => e.vnum))}
            onCreate={onCreateVnum}
            onOpenChange={setShowCreate}
            open={showCreate}
            triggerLabel={`Add`}
            vnumBlocks={vnumBlocks}
          />
        ) : null}
      </div>

      {onDeleteSelected ? (
        <DeleteSelectionBar
          count={selectedVnums.length}
          deletePending={deletePending}
          onDelete={() => {
            onDeleteSelected(selectedVnums);
          }}
        />
      ) : null}

      <div className={viewMode === "table" ? "block" : "hidden"}>
        <DesktopTable
          accentColor={accentColor}
          basePath={basePath}
          canCreate={canCreate}
          columns={columns}
          label={label}
          rows={rows}
          searching={searching}
          secondaryLabel={secondaryLabel}
          selectable={selectable}
          selectedIds={selectedIds}
          setShowCreate={setShowCreate}
          sorting={sorting}
          toggleAllPageSelected={toggleAllPageSelected}
          toggleSelected={toggleSelected}
          toggleSort={toggleSort}
        />
      </div>

      <div className={viewMode === "card" ? "block" : "hidden"}>
        <MobileCardList
          accentColor={accentColor}
          basePath={basePath}
          canCreate={canCreate}
          label={label}
          rows={rows}
          searching={searching}
          selectable={selectable}
          selectedIds={selectedIds}
          setShowCreate={setShowCreate}
          toggleAllPageSelected={toggleAllPageSelected}
          toggleSelected={toggleSelected}
        />
      </div>

      <TablePagination
        canNextPage={canNextPage}
        canPreviousPage={canPreviousPage}
        onNextPage={nextPage}
        onPreviousPage={previousPage}
        pageIndex={pageIndex}
        totalPages={totalPages}
      />

      <p className="text-muted-foreground mt-3 text-xs">
        {search
          ? `${filteredCount} results (${entities.length} total)`
          : `${entities.length} ${label.toLowerCase()}`}
      </p>
    </>
  );
}

function accentStyle(color: string): React.CSSProperties {
  const style: Record<string, string> = { "--entity-accent": color };
  return style;
}

function EntityRow({
  accentColor,
  basePath,
  entity,
  isSelected,
  onToggleSelected,
  secondaryLabel,
  selectable,
}: {
  accentColor?: string | undefined;
  basePath: string;
  entity: EntityListItem;
  isSelected: boolean;
  onToggleSelected: (selected: boolean) => void;
  secondaryLabel?: string | undefined;
  selectable: boolean;
}) {
  const to = `${basePath}/${entity.vnum}`;
  return (
    <TableRow
      aria-label={`${entity.name || "(unnamed)"} (vnum ${entity.vnum})`}
      className="entity-row has-[a:focus-visible]:ring-accent group hover:bg-muted/50 has-[a:focus-visible]:bg-muted/30 transition-colors duration-150 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-inset"
      style={accentColor ? accentStyle(accentColor) : undefined}
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
            checked={isSelected}
            onCheckedChange={(checked) => {
              onToggleSelected(checked === true);
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
        <TableCell className="hidden p-0">
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

function SelectAllCheckbox({
  rows,
  selectedIds,
  toggleAllPageSelected,
}: {
  rows: EntityListItem[];
  selectedIds: Record<string, boolean>;
  toggleAllPageSelected: (checked: boolean) => void;
}) {
  const checked =
    rows.length > 0 && rows.every((r) => selectedIds[String(r.vnum)])
      ? true
      : rows.some((r) => selectedIds[String(r.vnum)])
        ? "indeterminate"
        : false;
  return (
    <Checkbox
      aria-label="Select all on this page"
      checked={checked}
      onCheckedChange={(c) => {
        toggleAllPageSelected(c === true);
      }}
    />
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
            onClick={onShowCreate}
            size="inline"
            variant="inline"
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

function DesktopTable({
  accentColor,
  basePath,
  canCreate,
  columns,
  label,
  rows,
  searching,
  secondaryLabel,
  selectable,
  selectedIds,
  setShowCreate,
  sorting,
  toggleAllPageSelected,
  toggleSelected,
  toggleSort,
}: {
  accentColor?: string | undefined;
  basePath: string;
  canCreate: boolean;
  columns: Array<Column<EntityListItem>>;
  label: string;
  rows: EntityListItem[];
  searching: boolean;
  secondaryLabel?: string | undefined;
  selectable: boolean;
  selectedIds: Record<string, boolean>;
  setShowCreate: (open: boolean) => void;
  sorting: { desc: boolean; id: string };
  toggleAllPageSelected: (checked: boolean) => void;
  toggleSelected: (id: string, checked: boolean) => void;
  toggleSort: (id: string) => void;
}) {
  return (
    <Table>
      <SortableTableHeader
        columnClassName={(id) => COLUMN_WIDTHS[id]}
        columns={columns}
        headerOverrides={
          selectable
            ? {
                select: (
                  <SelectAllCheckbox
                    rows={rows}
                    selectedIds={selectedIds}
                    toggleAllPageSelected={toggleAllPageSelected}
                  />
                ),
              }
            : undefined
        }
        onToggleSort={toggleSort}
        sorting={sorting}
      />

      <TableBody>
        {rows.map((entity) => (
          <EntityRow
            accentColor={accentColor}
            basePath={basePath}
            entity={entity}
            isSelected={selectedIds[String(entity.vnum)] === true}
            key={entity.vnum}
            onToggleSelected={(checked) => {
              toggleSelected(String(entity.vnum), checked);
            }}
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
                canCreate={canCreate}
                label={label}
                onShowCreate={() => {
                  setShowCreate(true);
                }}
                searching={searching}
              />
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

function EntityCardRow({
  accentColor,
  basePath,
  entity,
  isSelected,
  onToggleSelected,
  selectable,
}: {
  accentColor?: string | undefined;
  basePath: string;
  entity: EntityListItem;
  isSelected: boolean;
  onToggleSelected: (selected: boolean) => void;
  selectable: boolean;
}) {
  const to = `${basePath}/${entity.vnum}`;
  return (
    <div
      className="entity-row flex items-center gap-3 py-2.5"
      style={accentColor ? accentStyle(accentColor) : undefined}
    >
      {selectable ? (
        <Checkbox
          aria-label={`Select ${entity.name || entity.vnum}`}
          checked={isSelected}
          onCheckedChange={(checked) => {
            onToggleSelected(checked === true);
          }}
        />
      ) : null}

      <Link
        className="min-w-0 flex-1"
        to={to}
      >
        <span className="text-accent font-mono text-xs">{entity.vnum}</span>

        <span className="text-foreground block text-sm">
          {entity.name || "(unnamed)"}
        </span>

        {entity.metadata ? (
          <span className="text-muted-foreground block text-xs">
            {entity.metadata}
          </span>
        ) : null}
      </Link>
    </div>
  );
}

function MobileCardList({
  accentColor,
  basePath,
  canCreate,
  label,
  rows,
  searching,
  selectable,
  selectedIds,
  setShowCreate,
  toggleAllPageSelected,
  toggleSelected,
}: {
  accentColor?: string | undefined;
  basePath: string;
  canCreate: boolean;
  label: string;
  rows: EntityListItem[];
  searching: boolean;
  selectable: boolean;
  selectedIds: Record<string, boolean>;
  setShowCreate: (open: boolean) => void;
  toggleAllPageSelected: (checked: boolean) => void;
  toggleSelected: (id: string, checked: boolean) => void;
}) {
  return (
    <div>
      {selectable ? (
        <div className="flex items-center gap-2 py-2">
          <SelectAllCheckbox
            rows={rows}
            selectedIds={selectedIds}
            toggleAllPageSelected={toggleAllPageSelected}
          />

          <span className="text-muted-foreground text-xs">Select all</span>
        </div>
      ) : null}

      <div className="divide-border divide-y">
        {rows.map((entity) => (
          <EntityCardRow
            accentColor={accentColor}
            basePath={basePath}
            entity={entity}
            isSelected={selectedIds[String(entity.vnum)] === true}
            key={entity.vnum}
            onToggleSelected={(checked) => {
              toggleSelected(String(entity.vnum), checked);
            }}
            selectable={selectable}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyMessage
          canCreate={canCreate}
          label={label}
          onShowCreate={() => {
            setShowCreate(true);
          }}
          searching={searching}
        />
      ) : null}
    </div>
  );
}

function buildColumns(
  selectable: boolean,
  secondaryLabel?: string,
): Array<Column<EntityListItem>> {
  const columns: Array<Column<EntityListItem>> = [];

  if (selectable) {
    columns.push({ header: "", id: "select" });
  }

  columns.push(
    { compare: numericSort("vnum"), header: "Vnum", id: "vnum" },
    { compare: textSort("name"), header: "Name", id: "name" },
  );

  if (secondaryLabel) {
    columns.push({ header: secondaryLabel, id: "secondary" });
  }

  return columns;
}

function DeleteSelectionBar({
  count,
  deletePending,
  onDelete,
}: {
  count: number;
  deletePending?: boolean | undefined;
  onDelete: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="mb-4">
      <Button
        disabled={deletePending}
        onClick={onDelete}
        size="sm"
        variant="destructive"
      >
        <Trash2 className="mr-1.5 h-4 w-4" />
        Delete {count}
      </Button>
    </div>
  );
}

function matchEntity(item: EntityListItem, search: string): boolean {
  const s = search.toLowerCase();
  return (
    item.name.toLowerCase().includes(s) ||
    String(item.vnum).includes(search) ||
    (item.secondary?.toLowerCase().includes(s) ?? false) ||
    (item.metadata?.toLowerCase().includes(s) ?? false)
  );
}
