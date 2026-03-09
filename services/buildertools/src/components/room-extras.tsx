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
  vnum: number;
}

export function RoomExtras({ extras, onChange, vnum }: RoomExtrasProps) {
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
    <fieldset className="bg-card border-border/50 rounded-lg border p-5">
      <SectionHeader
        action={
          <AddButton
            aria-label="Add extra description"
            onClick={addExtra}
          />
        }
        title="Extra Descriptions"
        tooltip="Extra descriptions for 'look <keyword>' in-game. Keywords are space-separated."
      />

      <div className="space-y-3">
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
              className="border-border/30 bg-muted/20 space-y-2 rounded border p-3"
              key={prefix}
            >
              <div className="flex justify-end">
                <Button
                  aria-label={`Remove extra description ${index + 1}`}
                  className="text-destructive/80 hover:text-destructive shrink-0 hover:cursor-pointer hover:no-underline"
                  onClick={() => {
                    if (hasExtraData(extra)) {
                      setPendingRemove(index);
                    } else {
                      removeExtra(index);
                    }
                  }}
                  size="xs"
                  variant="link"
                >
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-[auto_auto_1.5rem] gap-x-3 gap-y-2">
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
