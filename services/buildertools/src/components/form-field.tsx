import { useState } from "react";

import type { FieldDef } from "@/shared/types/entity-form.ts";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { FieldTooltip } from "./info-tooltip.tsx";
import { NumberInput } from "./number-input.tsx";
import { EntityPicker } from "./pickers/entity-picker.tsx";

export function FormField({
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
  const { addable, fullWidth, key, readOnly, type } = field;

  const hasValue =
    typeof value === "string" ? value.trim() !== "" : value !== undefined;
  const [expanded, setExpanded] = useState(!addable || hasValue);

  const handleChange = readOnly
    ? undefined
    : (key: string, v: number | string) => {
        onChange(key, v);
      };

  const tooltipElement = renderFieldTooltip(field);
  const labelContent = renderLabelContent(field);

  if (addable && !expanded) {
    return (
      <div className="col-span-full">
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

  const dirtyClass = isDirty ? "border-amber-400/50" : undefined;

  const inputElement = (
    <FieldInput
      className={dirtyClass}
      field={field}
      onChange={handleChange}
      value={value}
    />
  );

  if (fullWidth ?? (type === "textarea" || type === "bitfield")) {
    return (
      <div className={cn("col-span-full pb-1", readOnly && "opacity-60")}>
        {labelContent || tooltipElement ? (
          <Label htmlFor={key}>
            {labelContent}
            {tooltipElement}

            {field.addable ? (
              <Button
                className="h-auto px-1 py-0"
                onClick={() => {
                  handleChange?.(key, "");
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
        "col-span-full",
        "sm:col-span-3 sm:grid sm:grid-cols-subgrid sm:items-baseline",
        readOnly && "opacity-60",
      )}
    >
      {labelContent ? (
        <Label
          className="mb-0.5 sm:mb-0 sm:justify-end"
          htmlFor={key}
        >
          {labelContent}
          <span className="sm:hidden">{tooltipElement}</span>
        </Label>
      ) : (
        <div />
      )}

      <div className="min-w-0">{inputElement}</div>

      <div className="hidden justify-self-center sm:block">
        {tooltipElement}
      </div>
    </div>
  );
}

function toNumericValue(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function FieldInput({
  className,
  field,
  onChange,
  value,
}: {
  className?: string | undefined;
  field: FieldDef;
  onChange: ((key: string, value: number | string) => void) | undefined;
  value: number | string | undefined;
}) {
  if (field.type === "textarea") {
    return (
      <Textarea
        className={cn("min-h-16 text-base sm:min-h-27", className)}
        disabled={field.readOnly}
        id={field.key}
        onChange={(e) => {
          onChange?.(field.key, e.target.value);
        }}
        value={value ?? ""}
      />
    );
  }

  if (field.type === "enum") {
    return (
      <EnumSelect
        className={className}
        disabled={field.readOnly}
        entries={field.enumEntries}
        id={field.key}
        onChange={(v) => {
          onChange?.(field.key, v);
        }}
        value={toNumericValue(value)}
      />
    );
  }

  if (field.type === "bitfield") {
    return (
      <BitfieldEditor
        className={className}
        entries={field.bitfieldEntries}
        id={field.key}
        onChange={(v) => {
          onChange?.(field.key, v);
        }}
        value={toNumericValue(value)}
      />
    );
  }

  if (field.type === "number") {
    return (
      <NumberInput
        className={className}
        disabled={field.readOnly}
        id={field.key}
        max={field.max}
        min={field.min}
        onValueChange={(v) => {
          onChange?.(field.key, v);
        }}
        step={field.step}
        value={toNumericValue(value)}
      />
    );
  }

  if (field.type === "object" || field.type === "room") {
    return (
      <EntityPicker
        className={className}
        id={field.key}
        max={field.max}
        min={field.min}
        onChange={(v) => {
          onChange?.(field.key, v);
        }}
        type={field.type}
        value={toNumericValue(value)}
      />
    );
  }

  return (
    <Input
      className={className}
      disabled={field.readOnly}
      id={field.key}
      onChange={(e) => {
        onChange?.(field.key, e.target.value);
      }}
      type="text"
      value={value ?? ""}
    />
  );
}

function renderFieldTooltip(field: FieldDef) {
  const { detailedTooltip, help, label, tooltip } = field;
  return tooltip || help || detailedTooltip ? (
    <FieldTooltip
      detailedTooltip={detailedTooltip}
      label={label}
    >
      {help ? <p className="font-medium">{help}</p> : null}
      {help && tooltip ? <Separator className="my-1.5" /> : null}
      {tooltip}
    </FieldTooltip>
  ) : null;
}

function renderLabelContent(field: FieldDef) {
  return field.label ? (
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
}
