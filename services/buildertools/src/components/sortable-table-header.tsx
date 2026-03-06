import { flexRender, type HeaderGroup } from "@tanstack/react-table";

import { sortIndicator } from "@/components/sort-indicator.ts";
import { Button } from "@/components/ui/button.tsx";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";

export function SortableTableHeader<TData>({
  columnClassName,
  headerGroups,
}: {
  columnClassName?: (columnId: string) => string | undefined;
  headerGroups: Array<HeaderGroup<TData>>;
}) {
  return (
    <TableHeader>
      {headerGroups.map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => (
            <TableHead
              className={columnClassName?.(header.column.id)}
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
                flexRender(header.column.columnDef.header, header.getContext())
              )}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}
