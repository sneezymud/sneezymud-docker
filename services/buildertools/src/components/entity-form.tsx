import { useState } from "react";

import type { BitfieldEntry, EnumEntry } from "@/shared/enums/types.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { NumberInput } from "./number-input.tsx";
import {
  BUTTON_DANGER_CLASS,
  BUTTON_PRIMARY_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  Z_STICKY_BAR,
} from "./styles.ts";

interface FieldDefBase {
  help?: string;
  key: string;
  label: string;
  required?: boolean | undefined;
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
  collapsible?: boolean | undefined;
  defaultCollapsed?: boolean | undefined;
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
    <form
      className="space-y-6"
      onSubmit={handleSubmit}
    >
      <div
        className={`sticky top-0 ${Z_STICKY_BAR} flex items-center gap-3 border-b border-zinc-700/30 bg-zinc-950/95 py-3 backdrop-blur-sm`}
      >
        <button
          className={BUTTON_PRIMARY_CLASS}
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
            className={`ml-auto ${BUTTON_DANGER_CLASS}`}
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
          collapsible={group.collapsible}
          defaultCollapsed={group.defaultCollapsed}
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
  const baseClass = INPUT_CLASS;

  const isFullWidth = field.type === "textarea" || field.type === "bitfield";

  return (
    <div
      className={`${isFullWidth ? "col-span-full" : ""} ${isDirty ? "border-l-2 border-l-amber-400/50 pl-2" : ""}`}
    >
      <label
        className={labelClass ? `${LABEL_CLASS} ${labelClass}` : LABEL_CLASS}
        htmlFor={field.key}
      >
        {field.label}
        {field.required ? (
          <span
            aria-label="required"
            className="ml-1 inline-block h-1 w-1 rounded-full bg-amber-400 align-super"
          />
        ) : null}
      </label>
      {field.type === "textarea" ? (
        <>
          <textarea
            className={`${baseClass} min-h-[160px] resize-y text-base`}
            id={field.key}
            onChange={(e) => {
              onChange(field.key, e.target.value);
            }}
            value={value ?? ""}
          />
          <p className="mt-1 text-right text-xs text-zinc-400">
            {String(value ?? "").length} characters
          </p>
        </>
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
          className={`${baseClass} font-mono`}
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
        <input
          className={baseClass}
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
  collapsible,
  defaultCollapsed,
  fields,
  labelClass,
  onChange,
  originalValues,
  title,
  values,
}: {
  collapsible?: boolean | undefined;
  defaultCollapsed?: boolean | undefined;
  fields: FieldDef[];
  labelClass?: string | undefined;
  onChange: (key: string, value: number | string) => void;
  originalValues?: Record<string, number | string> | undefined;
  title: string;
  values: Record<string, number | string>;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed === true);

  return (
    <fieldset className="rounded border border-zinc-700 p-4">
      <legend className="px-2 text-sm font-medium text-zinc-300">
        {collapsible ? (
          <button
            className="focus-visible:ring-accent flex items-center gap-1.5 hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
            onClick={() => {
              setCollapsed((prev) => !prev);
            }}
            type="button"
          >
            <span className="text-xs text-zinc-400">
              {collapsed ? "\u25B6" : "\u25BC"}
            </span>
            {title}
          </button>
        ) : (
          title
        )}
      </legend>
      <div
        className="collapse-grid"
        data-collapsed={collapsible && collapsed}
      >
        <div>
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
        </div>
      </div>
    </fieldset>
  );
}

export type { FieldDef, FieldGroupDef };
