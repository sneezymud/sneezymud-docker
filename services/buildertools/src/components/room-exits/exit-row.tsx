import type { RoomExit } from "@/shared/schemas/room.ts";

import { FormField } from "@/components/form-field.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { DIRECTION_TYPES } from "@/shared/enums/index.ts";

import { exitFields } from "./exit-fields.tsx";

export function ExitRow({
  exit,
  onChangeDirection,
  onRequestRemove,
  onUpdate,
  prefix,
  usedDirections,
}: {
  exit: RoomExit;
  onChangeDirection: (newDirection: number) => void;
  onRequestRemove: () => void;
  onUpdate: (field: keyof RoomExit, value: number | string) => void;
  prefix: string;
  usedDirections: Set<number>;
}) {
  const fields = exitFields(prefix);

  const values: Record<string, number | string> = {};
  for (const field of fields) {
    const exitKey = toExitKey(field.key, prefix);
    values[field.key] = exit[exitKey] ?? 0;
  }

  function handleChange(key: string, value: number | string) {
    onUpdate(toExitKey(key, prefix), value);
  }

  return (
    <div className="space-y-3">
      <ExitHeader
        exit={exit}
        onChangeDirection={onChangeDirection}
        onRequestRemove={onRequestRemove}
        prefix={prefix}
        usedDirections={usedDirections}
      />

      {fields.map((field) => (
        <FormField
          field={field}
          isDirty={false}
          key={field.key}
          onChange={handleChange}
          value={values[field.key]}
        />
      ))}
    </div>
  );
}

function toExitKey(fieldKey: string, prefix: string): keyof RoomExit {
  const suffix = fieldKey.slice(prefix.length + 1);
  const key = exitKeys[suffix];
  if (key === undefined) {
    throw new Error(`Unknown exit field key: ${suffix}`);
  }
  return key;
}

function ExitHeader({
  exit: { direction },
  onChangeDirection,
  onRequestRemove,
  prefix,
  usedDirections,
}: {
  exit: RoomExit;
  onChangeDirection: (newDirection: number) => void;
  onRequestRemove: () => void;
  prefix: string;
  usedDirections: Set<number>;
}) {
  return (
    <div className="flex items-center justify-between">
      <Select
        onValueChange={(value) => {
          onChangeDirection(Number(value));
        }}
        value={String(direction)}
      >
        <SelectTrigger id={`${prefix}-dir`}>
          <SelectValue />
        </SelectTrigger>

        <SelectContent position="popper">
          {DIRECTION_TYPES.filter(
            ({ value }) => value === direction || !usedDirections.has(value),
          ).map(({ label, value }) => (
            <SelectItem
              key={value}
              value={String(value)}
            >
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        aria-label={`Remove ${directionLabels.get(direction) ?? ""} exit`}
        className="shrink-0"
        onClick={onRequestRemove}
        size="xs"
        variant="inline-destructive"
      >
        Remove
      </Button>
    </div>
  );
}

const directionLabels = new Map(
  DIRECTION_TYPES.map(({ label, value }) => [value, label]),
);

const exitKeys: Record<string, keyof RoomExit> = {
  condition_flag: "condition_flag",
  description: "description",
  destination: "destination",
  key_num: "key_num",
  lock_difficulty: "lock_difficulty",
  name: "name",
  type: "type",
  weight: "weight",
} as const;
