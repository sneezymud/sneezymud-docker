import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";

import { ConfirmDialog } from "./confirm-dialog.tsx";
import { NumberInput } from "./number-input.tsx";
import { LABEL_CLASS } from "./styles.ts";

export interface ColumnDef<T> {
  key: keyof T & string;
  label: string;
  type: "number" | "text" | "textarea";
  width?: string;
}

interface SubTableProps<T extends Record<string, number | string>> {
  columns: Array<ColumnDef<T>>;
  emptyRow: T;
  label: string;
  onChange: (rows: T[]) => void;
  rows: T[];
  singularLabel: string;
}

export function SubTable<T extends Record<string, number | string>>({
  columns,
  emptyRow,
  label,
  onChange,
  rows,
  singularLabel,
}: SubTableProps<T>) {
  const [collapsed, setCollapsed] = useState(rows.length === 0);
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);

  // Stable row keys — track UUID per row via state
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    rows.map(() => crypto.randomUUID()),
  );

  // Sync key count with row count when rows change externally
  const [lastRowCount, setLastRowCount] = useState(rows.length);
  if (rows.length !== lastRowCount) {
    setLastRowCount(rows.length);
    if (rows.length > rowKeys.length) {
      const extra = Array.from({ length: rows.length - rowKeys.length }, () =>
        crypto.randomUUID(),
      );
      setRowKeys([...rowKeys, ...extra]);
    } else if (rows.length < rowKeys.length) {
      setRowKeys(rowKeys.slice(0, rows.length));
    }
  }

  const addRow = () => {
    setRowKeys((prev) => [...prev, crypto.randomUUID()]);
    onChange([...rows, { ...emptyRow }]);
    setCollapsed(false);
  };

  const removeRow = (index: number) => {
    setRowKeys((prev) => prev.filter((_, i) => i !== index));
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateTextRow = (index: number, key: keyof T & string, raw: string) => {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [key]: raw } : row,
    );
    onChange(updated);
  };

  const updateNumberRow = (
    index: number,
    key: keyof T & string,
    value: number,
  ) => {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [key]: value } : row,
    );
    onChange(updated);
  };

  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950";

  return (
    <Collapsible.Root
      asChild
      onOpenChange={(open) => {
        setCollapsed(!open);
      }}
      open={!collapsed}
    >
      <fieldset className="rounded border border-zinc-700 p-4">
        <legend className="px-2 text-sm font-medium text-zinc-300">
          <Collapsible.Trigger asChild>
            <button
              className="focus-visible:ring-accent flex items-center gap-1.5 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
              type="button"
            >
              <span className="text-xs text-zinc-400">
                {collapsed ? "\u25B6" : "\u25BC"}
              </span>
              {label}
              <span className="text-xs font-normal text-zinc-400">
                ({rows.length})
              </span>
            </button>
          </Collapsible.Trigger>
        </legend>

        <Collapsible.Content className="collapsible-content">
          <div className="space-y-2">
            {rows.length === 0 ? (
              <p className="py-2 text-sm text-zinc-400">
                No {label.toLowerCase()} yet. Click + to add.
              </p>
            ) : null}

            {rows.map((row, index) => (
              <div
                className="flex items-start gap-2 rounded border border-zinc-700/30 bg-zinc-800/20 p-2 transition-shadow hover:shadow-md hover:shadow-zinc-900/50"
                key={rowKeys[index]}
              >
                <div
                  className="grid flex-1 gap-2"
                  style={{
                    gridTemplateColumns: columns
                      .map((c) => c.width ?? "1fr")
                      .join(" "),
                  }}
                >
                  {columns.map((col) => (
                    <div key={col.key}>
                      <label
                        className={LABEL_CLASS}
                        htmlFor={`${label}-${index}-${col.key}`}
                      >
                        {col.label}
                      </label>
                      {col.type === "textarea" ? (
                        <textarea
                          className={`${inputClass} min-h-[40px] resize-y`}
                          id={`${label}-${index}-${col.key}`}
                          onChange={(e) => {
                            updateTextRow(index, col.key, e.target.value);
                          }}
                          value={String(row[col.key])}
                        />
                      ) : col.type === "number" ? (
                        <NumberInput
                          className={`${inputClass} font-mono`}
                          id={`${label}-${index}-${col.key}`}
                          onValueChange={(v) => {
                            updateNumberRow(index, col.key, v);
                          }}
                          value={(() => {
                            const v = row[col.key];
                            return typeof v === "number" ? v : Number(v) || 0;
                          })()}
                        />
                      ) : (
                        <input
                          className={inputClass}
                          id={`${label}-${index}-${col.key}`}
                          onChange={(e) => {
                            updateTextRow(index, col.key, e.target.value);
                          }}
                          type="text"
                          value={String(row[col.key])}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  aria-label={`Remove row ${index + 1}`}
                  className="focus-visible:ring-accent mt-[1.375rem] shrink-0 rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-red-900/30 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                  onClick={() => {
                    setPendingRemove(index);
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              className="focus-visible:ring-accent rounded border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
              onClick={addRow}
              type="button"
            >
              + Add {singularLabel.toLowerCase()}
            </button>
          </div>
        </Collapsible.Content>

        <ConfirmDialog
          confirmLabel="Remove"
          message={`Remove this ${singularLabel.toLowerCase()}?`}
          onCancel={() => {
            setPendingRemove(null);
          }}
          onConfirm={() => {
            if (pendingRemove !== null) {
              removeRow(pendingRemove);
            }
            setPendingRemove(null);
          }}
          open={pendingRemove !== null}
          variant="danger"
        />
      </fieldset>
    </Collapsible.Root>
  );
}
