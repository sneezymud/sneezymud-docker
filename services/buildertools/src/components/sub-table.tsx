import { useState } from "react";

import type { EnumEntry } from "@/shared/enums/types.ts";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";

import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { NumberInput } from "./number-input.tsx";
import { TagInput } from "./tag-input.tsx";

export type ColumnDef<T> = EnumColumnDef<T> | TextColumnDef<T>;

interface ColumnDefBase<T> {
  key: keyof T & string;
  label: string;
  width?: string;
}

interface TextColumnDef<T> extends ColumnDefBase<T> {
  type: "number" | "tags" | "text" | "textarea";
}

interface EnumColumnDef<T> extends ColumnDefBase<T> {
  entries: EnumEntry[];
  type: "enum";
}

interface SubTableProps<T extends Record<string, number | string>> {
  columns: Array<ColumnDef<T>>;
  emptyRow: T;
  help?: string;
  label: string;
  onChange: (rows: T[]) => void;
  rows: T[];
  singularLabel: string;
}

export function SubTable<T extends Record<string, number | string>>({
  columns,
  emptyRow,
  help,
  label,
  onChange,
  rows,
  singularLabel,
}: SubTableProps<T>) {
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

  return (
    <fieldset className="border-border rounded border p-4">
      <legend className="text-foreground flex items-center gap-1.5 px-2 text-base font-semibold">
        {label}
        <span className="text-muted-foreground text-xs font-normal">
          ({rows.length})
        </span>
      </legend>

      {help ? (
        <p className="text-muted-foreground mb-2 text-xs">{help}</p>
      ) : null}

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No {label.toLowerCase()} yet - use + to add.
          </p>
        ) : null}

        {rows.map((row, index) => (
          <div
            className="border-border/30 bg-muted/20 flex items-start gap-2 rounded border p-2 transition-shadow hover:shadow-md hover:shadow-black/20"
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
              {columns.map((col) => {
                const cellId = `${label}-${index}-${col.key}`;
                return (
                  <div key={col.key}>
                    <Label htmlFor={cellId}>{col.label}</Label>
                    <CellInput
                      entries={col.type === "enum" ? col.entries : undefined}
                      id={cellId}
                      onNumberChange={(v) => {
                        updateNumberRow(index, col.key, v);
                      }}
                      onTextChange={(v) => {
                        updateTextRow(index, col.key, v);
                      }}
                      type={col.type}
                      value={row[col.key] ?? ""}
                    />
                  </div>
                );
              })}
            </div>
            <Button
              aria-label={`Remove row ${index + 1}`}
              className="mt-[1.375rem] shrink-0"
              onClick={() => {
                setPendingRemove(index);
              }}
              size="xs"
              variant="ghost"
            >
              Remove
            </Button>
          </div>
        ))}

        <Button
          className="border-dashed"
          onClick={addRow}
          size="sm"
          variant="outline"
        >
          + Add {singularLabel.toLowerCase()}
        </Button>
      </div>
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
  );
}

function CellInput({
  entries,
  id,
  onNumberChange,
  onTextChange,
  type,
  value,
}: {
  entries?: EnumEntry[] | undefined;
  id: string;
  onNumberChange: (v: number) => void;
  onTextChange: (v: string) => void;
  type: "enum" | "number" | "tags" | "text" | "textarea";
  value: number | string;
}) {
  if (type === "enum" && entries) {
    return (
      <EnumSelect
        entries={entries}
        id={id}
        onChange={onNumberChange}
        value={
          typeof value === "number"
            ? value
            : Number.isFinite(Number(value))
              ? Number(value)
              : 0
        }
      />
    );
  }

  if (type === "tags") {
    return (
      <TagInput
        id={id}
        onChange={onTextChange}
        value={String(value)}
      />
    );
  }

  if (type === "textarea") {
    return (
      <Textarea
        className="min-h-10 px-2 py-1"
        id={id}
        onChange={(e) => {
          onTextChange(e.target.value);
        }}
        value={String(value)}
      />
    );
  }

  if (type === "number") {
    return (
      <NumberInput
        className="px-2 py-1 font-mono"
        id={id}
        onValueChange={onNumberChange}
        value={
          typeof value === "number"
            ? value
            : Number.isFinite(Number(value))
              ? Number(value)
              : 0
        }
      />
    );
  }

  return (
    <Input
      className="px-2 py-1"
      id={id}
      onChange={(e) => {
        onTextChange(e.target.value);
      }}
      type="text"
      value={String(value)}
    />
  );
}
