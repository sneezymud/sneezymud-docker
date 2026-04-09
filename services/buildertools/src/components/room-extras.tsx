import { useState } from "react";

import type { RoomExtra } from "@/shared/schemas/room.ts";
import type { FieldDef } from "@/shared/types/entity-form.ts";

import { AddButton } from "@/components/add-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useRowKeys } from "@/hooks/use-row-keys.ts";

import { ConfirmDialog } from "./confirm-dialog.tsx";
import { FormField } from "./form-field.tsx";
import { SectionHeader } from "./section-header.tsx";

function extraFields(prefix: string): FieldDef[] {
  return [
    {
      fullWidth: true,
      key: `${prefix}-name`,
      label: "Keywords",
      tooltip:
        "Space-separated keywords for 'look <keyword>' in-game. All lowercase.",
      type: "text",
    },
    {
      fullWidth: true,
      key: `${prefix}-description`,
      label: "Description",
      type: "textarea",
    },
  ];
}

const EXTRA_KEYS: Record<string, keyof RoomExtra> = {
  description: "description",
  name: "name",
};

function toExtraKey(fieldKey: string, prefix: string): keyof RoomExtra {
  const suffix = fieldKey.slice(prefix.length + 1);
  const key = EXTRA_KEYS[suffix];
  if (key === undefined) {
    throw new Error(`Unknown extra field key: ${suffix}`);
  }
  return key;
}

const hasExtraData = (extra: RoomExtra) =>
  extra.name !== "" || extra.description !== "";

interface RoomExtrasProps {
  extras: RoomExtra[];
  onChange: (extras: RoomExtra[]) => void;
  readOnly?: boolean;
  vnum: number;
}

export function RoomExtras({
  extras,
  onChange,
  readOnly,
  vnum,
}: RoomExtrasProps) {
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);
  const { removeKey, rowKeys, setRowKeys } = useRowKeys(extras.length);

  const addExtra = () => {
    const newExtra: RoomExtra = { description: "", name: "", vnum };
    const newKey = crypto.randomUUID();
    onChange([...extras, newExtra]);
    setRowKeys([...rowKeys, newKey]);
  };

  const removeExtra = (index: number) => {
    removeKey(index);
    onChange(extras.filter((_, i) => i !== index));
  };

  const update = (
    index: number,
    field: keyof RoomExtra,
    value: number | string,
  ) => {
    onChange(
      extras.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  };

  return (
    <fieldset
      className="p-1"
      disabled={readOnly}
    >
      <SectionHeader
        action={
          readOnly ? undefined : (
            <AddButton
              aria-label="Add extra description"
              className="max-h-min"
              onClick={addExtra}
            />
          )
        }
        title="Extra Descriptions"
        tooltip="Extra descriptions for 'look <keyword>' in-game. Keywords are space-separated."
      />

      <div className="space-y-10">
        {extras.map((extra, index) => {
          const prefix = rowKeys[index] ?? "";
          const fields = extraFields(prefix);
          const values: Record<string, number | string> = {};
          for (const field of fields) {
            const extraKey = toExtraKey(field.key, prefix);
            values[field.key] = extra[extraKey];
          }

          return (
            <div
              className="relative space-y-3"
              key={prefix}
            >
              {!readOnly && (
                <Button
                  aria-label={`Remove extra description ${index + 1}`}
                  className="absolute top-0 right-0 -mt-1.5 shrink-0"
                  onClick={() => {
                    if (hasExtraData(extra)) {
                      setPendingRemove(index);
                    } else {
                      removeExtra(index);
                    }
                  }}
                  size="xs"
                  variant="inline-destructive"
                >
                  Remove
                </Button>
              )}

              {fields.map((field) => (
                <FormField
                  field={field}
                  isDirty={false}
                  key={field.key}
                  onChange={(key, value) => {
                    update(index, toExtraKey(key, prefix), value);
                  }}
                  value={values[field.key]}
                />
              ))}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        message="This extra description has data. Remove it anyway?"
        onCancel={() => {
          setPendingRemove(null);
        }}
        onConfirm={() => {
          if (pendingRemove !== null) {
            removeExtra(pendingRemove);
            setPendingRemove(null);
          }
        }}
        open={pendingRemove !== null}
        title="Remove extra description?"
      />
    </fieldset>
  );
}
