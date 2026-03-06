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
import { RoomPicker } from "./room-picker.tsx";

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

  const inputElement = (
    <FieldInput
      field={field}
      onChange={handleChange}
      value={value}
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

function toNumericValue(value: number | string | undefined): number {
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function FieldInput({
  field,
  onChange,
  value,
}: {
  field: FieldDef;
  onChange: ((key: string, value: number | string) => void) | undefined;
  value: number | string | undefined;
}) {
  if (field.type === "textarea") {
    return (
      <Textarea
        className="min-h-27 text-base"
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

  if (field.type === "room") {
    return (
      <RoomPicker
        id={field.key}
        onChange={(v) => {
          onChange?.(field.key, v);
        }}
        value={toNumericValue(value)}
      />
    );
  }

  return (
    <Input
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
