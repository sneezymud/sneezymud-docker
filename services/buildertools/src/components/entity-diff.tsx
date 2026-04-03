import { useState } from "react";

import { cn } from "@/lib/utils.ts";

export interface DiffField {
  format?: (value: unknown) => string;
  key: string;
  label: string;
}

export interface EntityDiffProps {
  fields: DiffField[];
  immortal: null | Record<string, unknown>;
  production: null | Record<string, unknown>;
}

interface ClassifiedField {
  field: DiffField;
  status: "added" | "changed" | "removed" | "unchanged";
}

export function EntityDiff({ fields, immortal, production }: EntityDiffProps) {
  const classified = classifyFields(fields, immortal, production);
  const unchangedFields = classified.filter((c) => c.status === "unchanged");
  const changedFields = classified.filter((c) => c.status !== "unchanged");
  const [showUnchanged, setShowUnchanged] = useState(false);

  if (!immortal && !production) {
    return (
      <p className="text-muted-foreground py-4 text-sm">
        Entity does not exist in either database.
      </p>
    );
  }

  if (immortal && !production) {
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground mb-3 text-xs">
          New entity - not yet in production
        </p>

        {fields.map((field) => (
          <DiffRow
            field={field}
            immortalValue={immortal[field.key]}
            key={field.key}
            status="added"
          />
        ))}
      </div>
    );
  }

  if (!immortal && production) {
    return (
      <div className="space-y-1">
        <p className="text-muted-foreground mb-3 text-xs">
          Exists in production but not in builder workspace
        </p>

        {fields.map((field) => (
          <DiffRow
            field={field}
            key={field.key}
            productionValue={production[field.key]}
            status="removed"
          />
        ))}
      </div>
    );
  }

  // Both exist - show changed fields, then collapsible unchanged.
  // The early returns above guarantee both are non-null here.
  return (
    <BothExistDiff
      changedFields={changedFields}
      immortal={immortal ?? {}}
      production={production ?? {}}
      setShowUnchanged={setShowUnchanged}
      showUnchanged={showUnchanged}
      unchangedFields={unchangedFields}
    />
  );
}

function formatValue(value: unknown, format?: (v: unknown) => string): string {
  if (format) return format(value);
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "string") return value || "(empty)";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  // Handle arrays and objects with deep comparison
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

function ArrayItemDiff({
  format,
  immortalItems,
  productionItems,
}: {
  format?: ((v: unknown) => string) | undefined;
  immortalItems: unknown[];
  productionItems: unknown[];
}) {
  // Compare by serialized representation to find additions, removals, changes
  const maxLen = Math.max(immortalItems.length, productionItems.length);
  const rows: Array<{
    immortal?: unknown;
    production?: unknown;
    status: "added" | "changed" | "removed" | "unchanged";
  }> = [];

  for (let i = 0; i < maxLen; i++) {
    const iItem = i < immortalItems.length ? immortalItems[i] : undefined;
    const pItem = i < productionItems.length ? productionItems[i] : undefined;

    if (iItem === undefined) {
      rows.push({ production: pItem, status: "removed" });
    } else if (pItem === undefined) {
      rows.push({ immortal: iItem, status: "added" });
    } else if (valuesEqual(iItem, pItem)) {
      rows.push({ immortal: iItem, status: "unchanged" });
    } else {
      rows.push({ immortal: iItem, production: pItem, status: "changed" });
    }
  }

  return (
    <div className="mt-1 space-y-0.5 border-l-2 pl-2">
      {rows.map((row, i) => {
        const key = `item-${String(i)}`;

        if (row.status === "unchanged") {
          return (
            <div
              className="text-muted-foreground truncate text-xs"
              key={key}
            >
              {formatValue(row.immortal, format)}
            </div>
          );
        }

        if (row.status === "added") {
          return (
            <div
              className="truncate text-xs text-green-600"
              key={key}
            >
              + {formatValue(row.immortal, format)}
            </div>
          );
        }

        if (row.status === "removed") {
          return (
            <div
              className="text-destructive truncate text-xs line-through"
              key={key}
            >
              - {formatValue(row.production, format)}
            </div>
          );
        }

        // changed
        return (
          <div key={key}>
            <div className="text-destructive truncate text-xs line-through">
              - {formatValue(row.production, format)}
            </div>

            <div className="truncate text-xs text-green-600">
              + {formatValue(row.immortal, format)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ArrayDiffRow({
  field,
  immortalValue,
  productionValue,
  status,
}: {
  field: DiffField;
  immortalValue?: unknown;
  productionValue?: unknown;
  status: "added" | "changed" | "removed" | "unchanged";
}) {
  const iArr = Array.isArray(immortalValue) ? immortalValue : [];
  const pArr = Array.isArray(productionValue) ? productionValue : [];

  const countLabel =
    status === "unchanged"
      ? `${iArr.length} item${iArr.length === 1 ? "" : "s"}`
      : status === "added"
        ? `${iArr.length} item${iArr.length === 1 ? "" : "s"} (new)`
        : status === "removed"
          ? `${pArr.length} item${pArr.length === 1 ? "" : "s"} (removed)`
          : `${pArr.length} -> ${iArr.length} item${iArr.length === 1 ? "" : "s"}`;

  return (
    <div
      className={cn(
        "rounded-sm px-2 py-1.5 text-sm",
        status === "unchanged" && "text-muted-foreground",
      )}
    >
      <span className="text-muted-foreground text-xs font-medium">
        {field.label}
      </span>

      <div className="text-xs">{countLabel}</div>

      {status === "changed" && (
        <ArrayItemDiff
          format={field.format}
          immortalItems={iArr}
          productionItems={pArr}
        />
      )}
    </div>
  );
}

function DiffRow({
  field,
  immortalValue,
  productionValue,
  status,
}: {
  field: DiffField;
  immortalValue?: unknown;
  productionValue?: unknown;
  status: "added" | "changed" | "removed" | "unchanged";
}) {
  const isArray =
    Array.isArray(immortalValue) || Array.isArray(productionValue);

  if (isArray) {
    return (
      <ArrayDiffRow
        field={field}
        immortalValue={immortalValue}
        productionValue={productionValue}
        status={status}
      />
    );
  }

  const formattedImmortal = formatValue(immortalValue, field.format);
  const formattedProduction = formatValue(productionValue, field.format);

  return (
    <div
      className={cn(
        "rounded-sm px-2 py-1.5 text-sm",
        status === "unchanged" && "text-muted-foreground",
      )}
    >
      <span className="text-muted-foreground text-xs font-medium">
        {field.label}
      </span>

      {status === "unchanged" && (
        <div className="break-words whitespace-pre-wrap">
          {formattedImmortal}
        </div>
      )}

      {status === "added" && (
        <div className="break-words whitespace-pre-wrap text-green-600">
          {formattedImmortal}
        </div>
      )}

      {status === "removed" && (
        <div className="text-destructive break-words whitespace-pre-wrap line-through">
          {formattedProduction}
        </div>
      )}

      {status === "changed" && (
        <>
          <div className="text-destructive break-words whitespace-pre-wrap line-through">
            {formattedProduction}
          </div>

          <div className="break-words whitespace-pre-wrap text-green-600">
            {formattedImmortal}
          </div>
        </>
      )}
    </div>
  );
}

function BothExistDiff({
  changedFields,
  immortal,
  production,
  setShowUnchanged,
  showUnchanged,
  unchangedFields,
}: {
  changedFields: ClassifiedField[];
  immortal: Record<string, unknown>;
  production: Record<string, unknown>;
  setShowUnchanged: (fn: (prev: boolean) => boolean) => void;
  showUnchanged: boolean;
  unchangedFields: ClassifiedField[];
}) {
  const hasChanges = changedFields.length > 0;

  return (
    <div className="space-y-1">
      {!hasChanges && (
        <p className="text-muted-foreground mb-3 text-xs">
          No differences - builder version matches production
        </p>
      )}

      {changedFields.map(({ field, status }) => (
        <DiffRow
          field={field}
          immortalValue={immortal[field.key]}
          key={field.key}
          productionValue={production[field.key]}
          status={status}
        />
      ))}

      {unchangedFields.length > 0 && (
        <div className="pt-2">
          <button
            className="text-muted-foreground hover:text-foreground text-xs underline"
            onClick={() => {
              setShowUnchanged((prev) => !prev);
            }}
            type="button"
          >
            {showUnchanged
              ? "Hide unchanged fields"
              : `${unchangedFields.length} unchanged field${unchangedFields.length === 1 ? "" : "s"}`}
          </button>

          {showUnchanged && (
            <div className="mt-2 space-y-1">
              {unchangedFields.map(({ field }) => (
                <DiffRow
                  field={field}
                  immortalValue={immortal[field.key]}
                  key={field.key}
                  status="unchanged"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function classifyFields(
  fields: DiffField[],
  immortal: null | Record<string, unknown>,
  production: null | Record<string, unknown>,
): ClassifiedField[] {
  return fields.map((field) => {
    const iVal = immortal?.[field.key];
    const pVal = production?.[field.key];

    if (production === null) {
      return { field, status: "added" };
    }
    if (immortal === null) {
      return { field, status: "removed" };
    }
    if (valuesEqual(iVal, pVal)) {
      return { field, status: "unchanged" };
    }
    return { field, status: "changed" };
  });
}
