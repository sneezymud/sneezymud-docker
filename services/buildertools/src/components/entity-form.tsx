import { Fragment, useState } from "react";

import type { BitfieldEntry, EnumEntry } from "@/shared/enums/types.ts";

import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { FieldTooltip } from "./info-tooltip.tsx";
import { NumberInput } from "./number-input.tsx";
import { RoomPicker } from "./room-picker.tsx";

interface FieldDefBase {
  detailedTooltip?: React.ReactNode;
  fullWidth?: boolean;
  help?: string;
  key: string;
  label: string;
  readOnly?: boolean;
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

interface RoomFieldDef extends FieldDefBase {
  type: "room";
}

type FieldDef =
  | BitfieldFieldDef
  | EnumFieldDef
  | NumberFieldDef
  | RoomFieldDef
  | TextFieldDef;

interface FieldGroupDef {
  colSpan?: "full";
  detailedTooltip?: React.ReactNode;
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
        <div className="border-border bg-background/95 sticky top-0 z-10 flex items-center gap-3 border-b py-3 shadow-md backdrop-blur-sm">
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
              className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive ml-6"
              disabled={deletePending}
              onClick={() => {
                setShowDeleteConfirm(true);
              }}
              variant="outline"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>

        <div className="3xl:grid-cols-3 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <FieldGroup
              colSpan={group.colSpan}
              detailedTooltip={group.detailedTooltip}
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
  const isNarrowField =
    !isFullWidth && field.type !== "bitfield" && field.type !== "textarea";

  const handleChange = field.readOnly
    ? undefined
    : (key: string, v: number | string) => {
        onChange(key, v);
      };

  return (
    <div
      className={cn(
        isFullWidth && "col-span-full",
        isNarrowField && "max-w-xs",
        isDirty && "border-l-2 border-l-amber-400/50 pl-2",
        field.readOnly && "opacity-60",
      )}
    >
      {field.label || field.tooltip || field.help || field.detailedTooltip ? (
        <Label
          className={labelClass}
          htmlFor={field.key}
        >
          <span>
            {field.label}
            {field.required ? (
              <span
                aria-label="required"
                className="text-amber-400"
              >
                *
              </span>
            ) : null}
          </span>
          {field.tooltip || field.help || field.detailedTooltip ? (
            <FieldTooltip
              detailedTooltip={field.detailedTooltip}
              label={field.label}
            >
              {field.help ? <p className="font-medium">{field.help}</p> : null}
              {field.help && field.tooltip ? (
                <Separator className="my-1.5" />
              ) : null}
              {field.tooltip}
            </FieldTooltip>
          ) : null}
        </Label>
      ) : null}
      {field.type === "textarea" ? (
        <Textarea
          className="min-h-27 text-base"
          disabled={field.readOnly}
          id={field.key}
          onChange={(e) => {
            handleChange?.(field.key, e.target.value);
          }}
          value={value ?? ""}
        />
      ) : field.type === "enum" ? (
        <EnumSelect
          disabled={field.readOnly}
          entries={field.enumEntries}
          id={field.key}
          onChange={(v) => {
            handleChange?.(field.key, v);
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
            handleChange?.(field.key, v);
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
          disabled={field.readOnly}
          id={field.key}
          max={field.max}
          min={field.min}
          onValueChange={(v) => {
            handleChange?.(field.key, v);
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
      ) : field.type === "room" ? (
        <RoomPicker
          id={field.key}
          onChange={(v) => {
            handleChange?.(field.key, v);
          }}
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
          disabled={field.readOnly}
          id={field.key}
          onChange={(e) => {
            handleChange?.(field.key, e.target.value);
          }}
          type="text"
          value={value ?? ""}
        />
      )}
    </div>
  );
}

function FieldGroup({
  colSpan,
  detailedTooltip,
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
  detailedTooltip?: React.ReactNode;
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
      className={cn("p-4 shadow-sm", colSpan === "full" && "col-span-full")}
    >
      <legend className="text-foreground text-lg font-semibold">
        {title}
        {tooltip || detailedTooltip ? (
          <FieldTooltip
            detailedTooltip={detailedTooltip}
            label={title}
          >
            {tooltip}
          </FieldTooltip>
        ) : null}
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
