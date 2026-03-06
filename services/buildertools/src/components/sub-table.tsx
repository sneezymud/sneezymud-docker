import type { EnumEntry } from "@/shared/types/enums.ts";

import { AddButton } from "@/components/add-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useRowKeys } from "@/hooks/use-row-keys.ts";

import { EnumSelect } from "./enum-select.tsx";
import { NumberInput } from "./number-input.tsx";
import { SectionHeader } from "./section-header.tsx";
import { TagInput } from "./tag-input.tsx";

export type ColumnDef<T> =
  | CustomColumnDef<T>
  | EnumColumnDef<T>
  | TextColumnDef<T>;

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

interface CustomColumnDef<T> extends ColumnDefBase<T> {
  renderCell: (
    row: T,
    onChange: (value: number | string) => void,
    context: { id: string; onRowChange: (updates: Partial<T>) => void },
  ) => React.ReactNode;
  type: "custom";
}

interface SubTableProps<T extends Record<string, number | string>> {
  columns: Array<ColumnDef<T>>;
  emptyRow: T;
  help?: string;
  helpParagraph?: string;
  label: string;
  maxRows?: number;
  onChange: (rows: T[]) => void;
  readOnly?: boolean | undefined;
  rows: T[];
}

export function SubTable<T extends Record<string, number | string>>({
  columns,
  emptyRow,
  help,
  helpParagraph,
  label,
  maxRows,
  onChange,
  readOnly,
  rows,
}: SubTableProps<T>) {
  const { addKey, removeKey, rowKeys } = useRowKeys(rows.length);

  const addRow = () => {
    addKey();
    onChange([...rows, { ...emptyRow }]);
  };

  const removeRow = (index: number) => {
    removeKey(index);
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

  const updateRow = (index: number, updates: Partial<T>) => {
    const updated = rows.map((row, i) =>
      i === index ? { ...row, ...updates } : row,
    );
    onChange(updated);
  };

  return (
    <fieldset
      className="bg-card border-border/50 rounded-lg border p-5"
      disabled={readOnly}
    >
      <SectionHeader
        action={
          readOnly ? undefined : (
            <AddButton
              aria-label={`Add ${label.toLowerCase()}`}
              disabled={maxRows !== undefined && rows.length >= maxRows}
              onClick={addRow}
            />
          )
        }
        title={label}
        tooltip={help}
      />

      {helpParagraph ? (
        <p className="text-muted-foreground mt-1 mb-3 text-sm">
          {helpParagraph}
        </p>
      ) : null}

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            className="border-border/30 bg-muted/20 flex items-start gap-2 rounded border p-2 transition-shadow hover:shadow-md hover:shadow-black/20"
            key={rowKeys[index]}
          >
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: columns
                  .map((c) => c.width ?? "1fr")
                  .join(" "),
              }}
            >
              {columns.map((col) => {
                const cellId = `${label}-${index}-${col.key}`;
                return (
                  <div
                    className="flex flex-col gap-1"
                    key={col.key}
                  >
                    <Label htmlFor={cellId}>{col.label}</Label>

                    {col.type === "custom" ? (
                      col.renderCell(
                        row,
                        (v) => {
                          if (typeof v === "number") {
                            updateNumberRow(index, col.key, v);
                          } else {
                            updateTextRow(index, col.key, v);
                          }
                        },
                        {
                          id: cellId,
                          onRowChange: (updates) => {
                            updateRow(index, updates);
                          },
                        },
                      )
                    ) : (
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
                    )}
                  </div>
                );
              })}
            </div>

            {readOnly ? null : (
              <Button
                aria-label={`Remove row ${index + 1}`}
                className="text-muted-foreground hover:text-destructive dark:hover:bg-destructive/10 mt-5.5 shrink-0"
                onClick={() => {
                  removeRow(index);
                }}
                size="xs"
                variant="ghost"
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
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
        className="px-2 py-1"
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
