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
import { HelpTip } from "./help-tip.tsx";
import { FieldHelp } from "./info-tooltip.tsx";
import { NumberInput } from "./number-input.tsx";
import { EntityPicker } from "./pickers/entity-picker.tsx";

export function FormField({
  error,
  field,
  isDirty,
  onChange,
  value,
}: {
  error?: string;
  field: FieldDef;
  isDirty: boolean;
  onChange: (key: string, value: number | string) => void;
  value: number | string | undefined;
}) {
  const { addable, fullWidth, key, readOnly, type } = field;

  const hasValue =
    typeof value === "string" ? value.trim() !== "" : value !== undefined;
  const [expanded, setExpanded] = useState(!addable || hasValue);
  const { helpElement, helpLabelProps } = useFieldHelp(field);

  const handleChange = readOnly
    ? undefined
    : (key: string, v: number | string) => {
        onChange(key, v);
      };

  const labelContent = renderLabelContent(field);

  if (addable && !expanded) {
    return (
      <div className="col-span-full">
        <Label>
          <span {...helpLabelProps}>{labelContent}</span>

          <Button
            onClick={() => {
              setExpanded(true);
            }}
            size="inline"
            variant="inline"
          >
            Add
          </Button>
        </Label>

        {helpElement}
      </div>
    );
  }

  const inputElement = (
    <FieldInput
      className={isDirty ? "border-warning" : ""}
      field={field}
      onChange={handleChange}
      value={value}
    />
  );

  if (fullWidth ?? (type === "textarea" || type === "bitfield")) {
    return (
      <div
        className={cn("col-span-full", readOnly && "opacity-60")}
        id={`field-${key}`}
      >
        {labelContent !== null && (
          <Label
            className="mb-2 ml-0.5"
            htmlFor={key}
          >
            <span {...helpLabelProps}>{labelContent}</span>

            {field.addable === true && (
              <Button
                onClick={() => {
                  handleChange?.(key, "");
                  setExpanded(false);
                }}
                size="inline"
                variant="inline-destructive"
              >
                Remove
              </Button>
            )}
          </Label>
        )}

        {helpElement}
        {inputElement}

        {error ? (
          <p className="text-destructive mt-1 text-xs">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn("col-span-full", readOnly && "opacity-60")}
      id={`field-${key}`}
    >
      {labelContent ? (
        <Label
          className="mb-2 ml-0.5"
          htmlFor={key}
        >
          <span {...helpLabelProps}>{labelContent}</span>
        </Label>
      ) : (
        <div />
      )}

      <div className="min-w-0">
        {helpElement}
        {inputElement}

        {error ? (
          <p className="text-destructive mt-1 text-xs">{error}</p>
        ) : null}
      </div>

      <div />
    </div>
  );
}

function useFieldHelp(field: FieldDef) {
  const [helpOpen, setHelpOpen] = useState(false);
  const fieldHasHelp = !!(field.tooltip ?? field.help ?? field.detailedTooltip);

  const helpLabelProps = fieldHasHelp
    ? {
        className: cn(
          "inline-block cursor-help pb-0.5 decoration-muted-foreground/50 decoration-dotted underline underline-offset-4",
          helpOpen && "text-foreground decoration-foreground/50",
        ),
        onClick: () => {
          setHelpOpen((o) => !o);
        },
        role: "button" as const,
      }
    : {};

  const helpElement = fieldHasHelp ? (
    <FieldHelp
      detailedTooltip={field.detailedTooltip}
      label={field.label}
      open={helpOpen}
    >
      {field.help ? <p className="font-medium">{field.help}</p> : null}
      {field.help && field.tooltip ? <Separator className="my-1.5" /> : null}
      {field.tooltip}
    </FieldHelp>
  ) : null;

  return { helpElement, helpLabelProps };
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
        className={cn("min-h-16 text-base", className)}
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
        integer={field.integer}
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

function renderLabelContent(field: FieldDef) {
  return field.label ? (
    <span>
      {field.label}

      {field.required ? (
        <span
          aria-label="required"
          className="text-warning"
        >
          *
        </span>
      ) : null}

      {field.readOnly && field.disabledReason ? (
        <HelpTip text={field.disabledReason} />
      ) : null}
    </span>
  ) : null;
}
