import type { Column, SortState } from "@/hooks/use-searchable-table.ts";

import { sortIndicator } from "@/components/sort-indicator.ts";
import { Button } from "@/components/ui/button.tsx";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";

export function SortableTableHeader<T>({
  columnClassName,
  columns,
  headerOverrides,
  onToggleSort,
  sorting,
}: {
  columnClassName?: (columnId: string) => string | undefined;
  columns: Array<Column<T>>;
  headerOverrides?: Record<string, React.ReactNode> | undefined;
  onToggleSort: (id: string) => void;
  sorting: SortState;
}) {
  return (
    <TableHeader>
      <TableRow>
        {columns.map((col) => (
          <TableHead
            className={columnClassName?.(col.id)}
            key={col.id}
          >
            {headerOverrides?.[col.id] ??
              (col.compare ? (
                <Button
                  className="h-auto p-0"
                  onClick={() => {
                    onToggleSort(col.id);
                  }}
                  variant="ghost"
                >
                  {col.header}

                  {sorting.id === col.id
                    ? sortIndicator(sorting.desc ? "desc" : "asc")
                    : ""}
                </Button>
              ) : (
                col.header
              ))}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
