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
  renderCell: (input: {
    context: { id: string; onRowChange: (updates: Partial<T>) => void };
    onChange: (value: number | string) => void;
    row: T;
  }) => React.ReactNode;
  type: "custom";
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
}: {
  columns: Array<ColumnDef<T>>;
  emptyRow: T;
  help?: string;
  helpParagraph?: string;
  label: string;
  maxRows?: number;
  onChange: (rows: T[]) => void;
  readOnly?: boolean | undefined;
  rows: T[];
}) {
  const { addKey, removeKey, rowKeys } = useRowKeys(rows.length);

  function addRow() {
    addKey();
    onChange([...rows, { ...emptyRow }]);
  }

  function removeRow(index: number) {
    removeKey(index);
    onChange(rows.filter((_, i) => i !== index));
  }

  function updateCell(index: number, key: keyof T, value: number | string) {
    onChange(
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  function updateRow(index: number, updates: Partial<T>) {
    onChange(
      rows.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  }

  return (
    <fieldset
      className="space-y-4 p-1"
      disabled={readOnly}
    >
      <SectionHeader
        action={
          readOnly ? undefined : (
            <AddButton
              aria-label={`Add ${label.toLowerCase()}`}
              className="max-h-min"
              disabled={maxRows !== undefined && rows.length >= maxRows}
              onClick={addRow}
            />
          )
        }
        title={label}
        tooltip={helpParagraph ?? help}
      />

      {rows.map((row, index) => (
        <div
          className="border-border/30 bg-muted/20 rounded border p-2 transition-shadow duration-150 hover:shadow-md hover:shadow-black/20"
          key={rowKeys[index]}
        >
          <div className="relative flex flex-col gap-y-4">
            {readOnly ? null : (
              <Button
                aria-label={`Remove row ${index + 1}`}
                className="absolute top-0 right-0 -mt-1"
                onClick={() => {
                  removeRow(index);
                }}
                size="xs"
                variant="inline-destructive"
              >
                Remove
              </Button>
            )}

            {columns.map(({ key, label: colLabel, ...col }) => {
              const cellId = `${label}-${index}-${key}`;
              function handleCellChange(value: number | string) {
                updateCell(index, key, value);
              }
              return (
                <div
                  className="flex flex-col gap-1.5"
                  key={key}
                >
                  <Label htmlFor={cellId}>{colLabel}</Label>

                  {col.type === "custom" ? (
                    col.renderCell({
                      context: {
                        id: cellId,
                        onRowChange: (updates) => {
                          updateRow(index, updates);
                        },
                      },
                      onChange: handleCellChange,
                      row,
                    })
                  ) : (
                    <CellInput
                      entries={col.type === "enum" ? col.entries : undefined}
                      id={cellId}
                      onChange={handleCellChange}
                      type={col.type}
                      value={row[key] ?? ""}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </fieldset>
  );
}

function CellInput({
  entries,
  id,
  onChange,
  type,
  value,
}: {
  entries?: EnumEntry[] | undefined;
  id: string;
  onChange: (v: number | string) => void;
  type: "enum" | "number" | "tags" | "text" | "textarea";
  value: number | string;
}) {
  if (type === "enum" && entries) {
    return (
      <EnumSelect
        entries={entries}
        id={id}
        onChange={onChange}
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
        onChange={onChange}
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
          onChange(e.target.value);
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
        onValueChange={onChange}
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
        onChange(e.target.value);
      }}
      type="text"
      value={String(value)}
    />
  );
}
