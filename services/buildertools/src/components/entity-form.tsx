import { Info } from "lucide-react";
import { Fragment, useState } from "react";

import type { BitfieldEntry, EnumEntry } from "@/shared/enums/types.ts";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { NumberInput } from "./number-input.tsx";

interface FieldDefBase {
  fullWidth?: boolean;
  help?: string;
  key: string;
  label: string;
  required?: boolean | undefined;
  tooltip?: React.ReactNode;
}

interface TextFieldDef extends FieldDefBase {
  type: "text" | "textarea";
}

interface NumberFieldDef extends FieldDefBase {
  max?: number;
  min?: number;
  step?: number;
  type: "number";
}

interface EnumFieldDef extends FieldDefBase {
  enumEntries: EnumEntry[];
  type: "enum";
}

interface BitfieldFieldDef extends FieldDefBase {
  bitfieldEntries: BitfieldEntry[];
  type: "bitfield";
}

type FieldDef = BitfieldFieldDef | EnumFieldDef | NumberFieldDef | TextFieldDef;

interface FieldGroupDef {
  colSpan?: "full";
  fieldGroupSize?: number;
  fields: FieldDef[];
  gridCols?: string;
  labelClass?: string | undefined;
  title: string;
  tooltip?: React.ReactNode;
}

interface EntityFormProps {
  children?: React.ReactNode;
  deleteMessage?: string;
  deletePending?: boolean;
  dirty: boolean;
  groups: FieldGroupDef[];
  onChange: (key: string, value: number | string) => void;
  onDelete?: () => void;
  onReset?: () => void;
  onSave: () => void;
  originalValues?: Record<string, number | string> | undefined;
  saving: boolean;
  values: Record<string, number | string>;
}

export function EntityForm({
  children,
  deleteMessage,
  deletePending,
  dirty,
  groups,
  onChange,
  onDelete,
  onReset,
  onSave,
  originalValues,
  saving,
  values,
}: EntityFormProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave();
  };

  return (
    <TooltipProvider delayDuration={300}>
      <form
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <div className="border-border bg-background/95 sticky top-0 z-10 flex items-center gap-3 border-b py-3 shadow-sm backdrop-blur-sm">
          <Button
            disabled={!dirty || saving}
            type="submit"
          >
            {saving ? "Saving..." : "Save"}
          </Button>

          <span
            aria-live="polite"
            className="contents"
          >
            {dirty ? (
              <Badge
                className="animate-in fade-in slide-in-from-top-1 gap-1.5 text-amber-400 duration-150"
                variant="outline"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Unsaved changes
                {onReset ? (
                  <Button
                    className="ml-1"
                    onClick={onReset}
                    size="xs"
                    variant="link"
                  >
                    Discard
                  </Button>
                ) : null}
              </Badge>
            ) : null}
          </span>

          {onDelete ? (
            <Button
              className="ml-6"
              disabled={deletePending}
              onClick={() => {
                setShowDeleteConfirm(true);
              }}
              size="sm"
              variant="destructive"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>

        <div className="3xl:grid-cols-3 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <FieldGroup
              colSpan={group.colSpan}
              fieldGroupSize={group.fieldGroupSize}
              fields={group.fields}
              gridCols={group.gridCols}
              key={group.title}
              labelClass={group.labelClass}
              onChange={onChange}
              originalValues={originalValues}
              title={group.title}
              tooltip={group.tooltip}
              values={values}
            />
          ))}
        </div>

        {children}

        {onDelete ? (
          <ConfirmDialog
            confirmLabel="Yes, delete"
            message={deleteMessage ?? "Are you sure you want to delete this?"}
            onCancel={() => {
              setShowDeleteConfirm(false);
            }}
            onConfirm={() => {
              setShowDeleteConfirm(false);
              onDelete();
            }}
            open={showDeleteConfirm}
            title="Confirm Delete"
            variant="danger"
          />
        ) : null}
      </form>
    </TooltipProvider>
  );
}

function FieldTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground ml-1 inline-flex cursor-help"
          type="button"
        >
          <Info
            aria-hidden="true"
            className="h-3.5 w-3.5"
          />
        </button>
      </TooltipTrigger>
      <TooltipContent
        className="max-w-sm text-sm [&_li]:mb-0.5 [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:ml-3 [&_ul]:list-disc"
        sideOffset={5}
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function FormField({
  field,
  isDirty,
  labelClass,
  onChange,
  value,
}: {
  field: FieldDef;
  isDirty: boolean;
  labelClass?: string | undefined;
  onChange: (key: string, value: number | string) => void;
  value: number | string | undefined;
}) {
  const isFullWidth =
    field.fullWidth ?? (field.type === "textarea" || field.type === "bitfield");

  return (
    <div
      className={cn(
        isFullWidth && "col-span-full",
        isDirty && "border-l-2 border-l-amber-400/50 pl-2",
      )}
    >
      <Label
        className={labelClass}
        htmlFor={field.key}
      >
        {field.label}
        {field.required ? (
          <span
            aria-label="required"
            className="ml-0.5 text-amber-400"
          >
            *
          </span>
        ) : null}
        {field.tooltip ? <FieldTooltip>{field.tooltip}</FieldTooltip> : null}
      </Label>
      {field.type === "textarea" ? (
        <Textarea
          className="min-h-16 text-base"
          id={field.key}
          onChange={(e) => {
            onChange(field.key, e.target.value);
          }}
          value={value ?? ""}
        />
      ) : field.type === "enum" ? (
        <EnumSelect
          entries={field.enumEntries}
          id={field.key}
          onChange={(v) => {
            onChange(field.key, v);
          }}
          value={
            typeof value === "number"
              ? value
              : Number.isFinite(Number(value))
                ? Number(value)
                : 0
          }
        />
      ) : field.type === "bitfield" ? (
        <BitfieldEditor
          entries={field.bitfieldEntries}
          id={field.key}
          onChange={(v) => {
            onChange(field.key, v);
          }}
          value={
            typeof value === "number"
              ? value
              : Number.isFinite(Number(value))
                ? Number(value)
                : 0
          }
        />
      ) : field.type === "number" ? (
        <NumberInput
          className="font-mono"
          id={field.key}
          max={field.max}
          min={field.min}
          onValueChange={(v) => {
            onChange(field.key, v);
          }}
          step={field.step}
          value={
            typeof value === "number"
              ? value
              : Number.isFinite(Number(value))
                ? Number(value)
                : 0
          }
        />
      ) : (
        <Input
          id={field.key}
          onChange={(e) => {
            onChange(field.key, e.target.value);
          }}
          type="text"
          value={value ?? ""}
        />
      )}
      {field.help ? (
        <p className="text-muted-foreground mt-0.5 text-xs">{field.help}</p>
      ) : null}
    </div>
  );
}

function FieldGroup({
  colSpan,
  fieldGroupSize,
  fields,
  gridCols,
  labelClass,
  onChange,
  originalValues,
  title,
  tooltip,
  values,
}: {
  colSpan?: "full" | undefined;
  fieldGroupSize?: number | undefined;
  fields: FieldDef[];
  gridCols?: string | undefined;
  labelClass?: string | undefined;
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  title: string;
  tooltip?: React.ReactNode;
  values: Record<string, number | string>;
}) {
  return (
    <fieldset
      className={cn(
        "border-border rounded border p-4",
        colSpan === "full" && "col-span-full",
      )}
    >
      <legend className="text-foreground px-2 text-base font-semibold">
        {title}
        {tooltip ? <FieldTooltip>{tooltip}</FieldTooltip> : null}
      </legend>
      <div
        className={cn("grid gap-4", gridCols ?? "grid-cols-1 sm:grid-cols-2")}
      >
        {fields.map((field, i) => {
          const fieldDirty =
            originalValues !== undefined &&
            values[field.key] !== originalValues[field.key];
          const showSeparator =
            fieldGroupSize !== undefined && i > 0 && i % fieldGroupSize === 0;
          return (
            <Fragment key={field.key}>
              {showSeparator ? <Separator className="col-span-full" /> : null}
              <FormField
                field={field}
                isDirty={fieldDirty}
                labelClass={labelClass}
                onChange={onChange}
                value={values[field.key]}
              />
            </Fragment>
          );
        })}
      </div>
    </fieldset>
  );
}

export type { FieldDef, FieldGroupDef };
