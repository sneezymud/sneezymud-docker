import { useState } from "react";

import type { BitfieldEntry, EnumEntry } from "@/shared/enums/types.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";

interface FieldDefBase {
  help?: string;
  key: string;
  label: string;
}

interface TextFieldDef extends FieldDefBase {
  type: "text" | "textarea";
}

interface NumberFieldDef extends FieldDefBase {
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
  title: string;
}

interface EntityFormProps {
  children?: React.ReactNode;
  deleteMessage?: string;
  dirty: boolean;
  groups: FieldGroupDef[];
  onChange: (key: string, value: number | string) => void;
  onDelete?: () => void;
  onSave: () => void;
  saving: boolean;
  values: Record<string, number | string>;
}

export function EntityForm({
  children,
  deleteMessage,
  dirty,
  groups,
  onChange,
  onDelete,
  onSave,
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
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-700/30 bg-zinc-950/95 py-3 backdrop-blur-sm">
        <button
          className="rounded bg-zinc-600 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-500 disabled:opacity-50"
          disabled={!dirty || saving}
          type="submit"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        {dirty ? (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        ) : null}

        {onDelete ? (
          <button
            className="ml-auto rounded border border-red-800/50 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-900/20"
            onClick={() => {
              setShowDeleteConfirm(true);
            }}
            type="button"
          >
            Delete
          </button>
        ) : null}
      </div>

      {groups.map((group) => (
        <FieldGroup
          fields={group.fields}
          key={group.title}
          onChange={onChange}
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
  onChange,
  value,
}: {
  field: FieldDef;
  onChange: (key: string, value: number | string) => void;
  value: number | string | undefined;
}) {
  const baseClass =
    "w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500";

  const isFullWidth = field.type === "textarea" || field.type === "bitfield";

  return (
    <div className={isFullWidth ? "col-span-full" : ""}>
      <label
        className="mb-1 block text-xs text-zinc-400"
        htmlFor={field.key}
      >
        {field.label}
      </label>
      {field.type === "textarea" ? (
        <textarea
          className={`${baseClass} min-h-[160px] resize-y`}
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
      ) : (
        <input
          className={`${baseClass}${field.type === "number" ? "font-mono" : ""}`}
          id={field.key}
          onChange={(e) => {
            onChange(
              field.key,
              field.type === "number"
                ? Number(e.target.value) || 0
                : e.target.value,
            );
          }}
          type={field.type}
          value={value ?? (field.type === "number" ? 0 : "")}
        />
      )}
      {field.help ? (
        <p className="mt-0.5 text-xs text-zinc-500">{field.help}</p>
      ) : null}
    </div>
  );
}

function FieldGroup({
  fields,
  onChange,
  title,
  values,
}: {
  fields: FieldDef[];
  onChange: (key: string, value: number | string) => void;
  title: string;
  values: Record<string, number | string>;
}) {
  return (
    <fieldset className="rounded border border-zinc-700/50 p-4">
      <legend className="px-2 text-sm font-medium text-zinc-300">
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <FormField
            field={field}
            key={field.key}
            onChange={onChange}
            value={values[field.key]}
          />
        ))}
      </div>
    </fieldset>
  );
}

export type { FieldDef, FieldGroupDef };
