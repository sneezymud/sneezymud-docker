import * as Tooltip from "@radix-ui/react-tooltip";
import { useState } from "react";

import type { BitfieldEntry, EnumEntry } from "@/shared/enums/types.ts";

import { cn } from "@/lib/cn.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { Input, Textarea } from "./input.tsx";
import { Label } from "./label.tsx";
import { NumberInput } from "./number-input.tsx";

interface FieldDefBase {
  fullWidth?: boolean;
  help?: string;
  key: string;
  label: string;
  required?: boolean | undefined;
  tooltip?: string;
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
  fields: FieldDef[];
  labelClass?: string | undefined;
  title: string;
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
    <Tooltip.Provider delayDuration={300}>
      <form
        className="space-y-6"
        onSubmit={handleSubmit}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-700/30 bg-zinc-950/95 py-3 backdrop-blur-sm">
          <button
            className="bg-accent hover:bg-accent/80 focus-visible:ring-accent rounded px-4 py-2 text-sm text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!dirty || saving}
            type="submit"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <span
            aria-live="polite"
            className="contents"
          >
            {dirty ? (
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                Unsaved changes
                {onReset ? (
                  <button
                    className="ml-1 text-xs text-zinc-400 underline hover:text-zinc-200"
                    onClick={onReset}
                    type="button"
                  >
                    Discard
                  </button>
                ) : null}
              </span>
            ) : null}
          </span>

          {onDelete ? (
            <button
              className="focus-visible:ring-accent ml-auto rounded border border-red-800/50 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-900/20 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deletePending}
              onClick={() => {
                setShowDeleteConfirm(true);
              }}
              type="button"
            >
              {deletePending ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        {groups.map((group) => (
          <FieldGroup
            fields={group.fields}
            key={group.title}
            labelClass={group.labelClass}
            onChange={onChange}
            originalValues={originalValues}
            title={group.title}
            values={values}
          />
        ))}

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
    </Tooltip.Provider>
  );
}

function FieldTooltip({ text }: { text: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <span className="ml-1 inline-flex cursor-help text-zinc-500 hover:text-zinc-300">
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <path
              d="M12 16v-4M12 8h.01"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          className="tooltip-content z-50 max-w-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 shadow-lg"
          sideOffset={5}
        >
          {text}
          <Tooltip.Arrow className="fill-zinc-800" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
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
            className="ml-1 inline-block h-1 w-1 rounded-full bg-amber-400 align-super"
          />
        ) : null}
        {field.tooltip ? <FieldTooltip text={field.tooltip} /> : null}
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
          value={typeof value === "number" ? value : Number(value) || 0}
        />
      ) : field.type === "bitfield" ? (
        <BitfieldEditor
          entries={field.bitfieldEntries}
          id={field.key}
          onChange={(v) => {
            onChange(field.key, v);
          }}
          value={typeof value === "number" ? value : Number(value) || 0}
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
          value={typeof value === "number" ? value : Number(value) || 0}
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
        <p className="mt-0.5 text-xs text-zinc-400">{field.help}</p>
      ) : null}
    </div>
  );
}

function FieldGroup({
  fields,
  labelClass,
  onChange,
  originalValues,
  title,
  values,
}: {
  fields: FieldDef[];
  labelClass?: string | undefined;
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  title: string;
  values: Record<string, number | string>;
}) {
  return (
    <fieldset className="rounded border border-zinc-700 p-4">
      <legend className="px-2 text-sm font-medium text-zinc-300">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const fieldDirty =
            originalValues !== undefined &&
            values[field.key] !== originalValues[field.key];
          return (
            <FormField
              field={field}
              isDirty={fieldDirty}
              key={field.key}
              labelClass={labelClass}
              onChange={onChange}
              value={values[field.key]}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

export type { FieldDef, FieldGroupDef };
