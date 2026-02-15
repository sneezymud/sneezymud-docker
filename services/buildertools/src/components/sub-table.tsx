import { useState } from "react";

import { ConfirmDialog } from "./confirm-dialog.tsx";

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
}

export function SubTable<T extends Record<string, number | string>>({
  columns,
  emptyRow,
  label,
  onChange,
  rows,
}: SubTableProps<T>) {
  const [collapsed, setCollapsed] = useState(rows.length === 0);
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);

  const addRow = () => {
    onChange([...rows, { ...emptyRow }]);
    setCollapsed(false);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, key: keyof T & string, raw: string) => {
    const col = columns.find((c) => c.key === key);
    const value = col?.type === "number" ? Number(raw) || 0 : raw;
    const updated = rows.map((row, i) =>
      i === index ? { ...row, [key]: value } : row,
    );
    onChange(updated);
  };

  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500";
  const numberInputClass = `${inputClass} font-mono`;

  return (
    <fieldset className="rounded border border-zinc-700/50 p-4">
      <legend className="px-2 text-sm font-medium text-zinc-300">
        <button
          className="flex items-center gap-1.5 hover:text-zinc-100"
          onClick={() => {
            setCollapsed((prev) => !prev);
          }}
          type="button"
        >
          <span className="text-xs text-zinc-500">
            {collapsed ? "\u25B6" : "\u25BC"}
          </span>
          {label}
          <span className="text-xs font-normal text-zinc-500">
            ({String(rows.length)})
          </span>
        </button>
      </legend>

      {collapsed ? null : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              className="flex items-start gap-2 rounded border border-zinc-700/30 bg-zinc-800/20 p-2"
              key={`row-${String(index)}`}
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
                    {index === 0 ? (
                      <label
                        className="mb-1 block text-xs text-zinc-500"
                        htmlFor={`${label}-${String(index)}-${col.key}`}
                      >
                        {col.label}
                      </label>
                    ) : null}
                    {col.type === "textarea" ? (
                      <textarea
                        className={`${inputClass} min-h-[40px] resize-y`}
                        id={`${label}-${String(index)}-${col.key}`}
                        onChange={(e) => {
                          updateRow(index, col.key, e.target.value);
                        }}
                        value={String(row[col.key])}
                      />
                    ) : (
                      <input
                        className={
                          col.type === "number" ? numberInputClass : inputClass
                        }
                        id={`${label}-${String(index)}-${col.key}`}
                        onChange={(e) => {
                          updateRow(index, col.key, e.target.value);
                        }}
                        type={col.type}
                        value={String(row[col.key])}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                className="mt-5 shrink-0 rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
                onClick={() => {
                  setPendingRemove(index);
                }}
                title="Remove row"
                type="button"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            className="rounded border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
            onClick={addRow}
            type="button"
          >
            + Add {label.toLowerCase().replace(/s$/, "")}
          </button>
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Remove"
        message={`Remove this ${label.toLowerCase().replace(/s$/, "")}?`}
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
  );
}
