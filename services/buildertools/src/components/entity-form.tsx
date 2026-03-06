import { Fragment, useState } from "react";

import type { BitfieldEntry, EnumEntry } from "@/shared/enums/types.ts";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { FieldTooltip } from "./info-tooltip.tsx";
import { NumberInput } from "./number-input.tsx";
import { RoomPicker } from "./room-picker.tsx";

interface FieldDefBase {
  addable?: boolean;
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
  header?: React.ReactNode;
  labelClass?: string | undefined;
  title: string;
  tooltip?: React.ReactNode;
}

interface EntityFormProps {
  children?: React.ReactNode;
  groups: FieldGroupDef[];
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  values: Record<string, number | string>;
}

export function EntityForm({
  children,
  groups,
  onChange,
  originalValues,
  values,
}: EntityFormProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        <div className="3xl:grid-cols-3 grid gap-6 lg:grid-cols-2">
          {groups.map((group) => (
            <FieldGroup
              colSpan={group.colSpan}
              detailedTooltip={group.detailedTooltip}
              fieldGroupSize={group.fieldGroupSize}
              fields={group.fields}
              gridCols={group.gridCols}
              header={group.header}
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
      </div>
    </TooltipProvider>
  );
}

function FormField({
  field,
  isDirty,
  onChange,
  value,
}: {
  field: FieldDef;
  isDirty: boolean;
  onChange: (key: string, value: number | string) => void;
  value: number | string | undefined;
}) {
  const hasValue =
    typeof value === "string" ? value.trim() !== "" : value !== undefined;
  const [expanded, setExpanded] = useState(!field.addable || hasValue);

  const isFullWidth =
    field.fullWidth ?? (field.type === "textarea" || field.type === "bitfield");

  const handleChange = field.readOnly
    ? undefined
    : (key: string, v: number | string) => {
        onChange(key, v);
      };

  const tooltipElement =
    field.tooltip || field.help || field.detailedTooltip ? (
      <FieldTooltip
        detailedTooltip={field.detailedTooltip}
        label={field.label}
      >
        {field.help ? <p className="font-medium">{field.help}</p> : null}
        {field.help && field.tooltip ? <Separator className="my-1.5" /> : null}
        {field.tooltip}
      </FieldTooltip>
    ) : null;

  const labelContent = field.label ? (
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
  ) : null;

  if (field.addable && !expanded) {
    return (
      <div className="col-span-full border-l-2 border-l-transparent pl-2">
        <Label>
          {labelContent}
          {tooltipElement}
          <Button
            className="h-auto px-1 py-0"
            onClick={() => {
              setExpanded(true);
            }}
            variant="link"
          >
            Add
          </Button>
        </Label>
      </div>
    );
  }

  const inputElement =
    field.type === "textarea" ? (
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
    );

  const dirtyClass = isDirty ? "border-l-amber-400/50" : "border-l-transparent";

  if (isFullWidth) {
    return (
      <div
        className={cn(
          "col-span-full pb-1",
          "border-l-2 pl-2",
          dirtyClass,
          field.readOnly && "opacity-60",
        )}
      >
        {labelContent || tooltipElement ? (
          <Label htmlFor={field.key}>
            {labelContent}
            {tooltipElement}
            {field.addable ? (
              <Button
                className="h-auto px-1 py-0"
                onClick={() => {
                  handleChange?.(field.key, "");
                  setExpanded(false);
                }}
                variant="link"
              >
                Remove
              </Button>
            ) : null}
          </Label>
        ) : null}
        {inputElement}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "col-span-3 grid grid-cols-subgrid items-baseline",
        "border-l-2 pl-2",
        dirtyClass,
        field.readOnly && "opacity-60",
      )}
    >
      {labelContent ? (
        <Label
          className="mb-0 justify-end"
          htmlFor={field.key}
        >
          {labelContent}
        </Label>
      ) : (
        <div />
      )}
      <div className="min-w-0">{inputElement}</div>
      <div className="justify-self-center">{tooltipElement}</div>
    </div>
  );
}

function FieldGroup({
  colSpan,
  detailedTooltip,
  fieldGroupSize,
  fields,
  gridCols: _gridCols,
  header,
  labelClass: _labelClass,
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
  header?: React.ReactNode;
  labelClass?: string | undefined;
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  title: string;
  tooltip?: React.ReactNode;
  values: Record<string, number | string>;
}) {
  const allCompact = fields.every(
    (f) => !(f.fullWidth ?? (f.type === "textarea" || f.type === "bitfield")),
  );
  const multiColumn = allCompact && fields.length > 1;

  return (
    <fieldset
      className={cn(
        "bg-card border-border/50 rounded-lg border p-5",
        colSpan === "full" && "col-span-full",
      )}
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
      {header}
      <div
        className={cn(
          "grid grid-cols-[auto_auto_1.5rem] gap-x-3 gap-y-2",
          multiColumn &&
            "sm:grid-flow-col sm:grid-cols-[auto_auto_1.5rem_auto_auto_1.5rem]",
        )}
        style={
          multiColumn
            ? {
                gridTemplateRows: `repeat(${Math.ceil(fields.length / 2)}, auto)`,
              }
            : undefined
        }
      >
        {fields.map((field, i) => {
          const fieldDirty =
            originalValues !== undefined &&
            values[field.key] !== originalValues[field.key];
          const showSeparator =
            !multiColumn &&
            fieldGroupSize !== undefined &&
            i > 0 &&
            i % fieldGroupSize === 0;
          return (
            <Fragment key={field.key}>
              {showSeparator ? <Separator className="col-span-full" /> : null}
              <FormField
                field={field}
                isDirty={fieldDirty}
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
