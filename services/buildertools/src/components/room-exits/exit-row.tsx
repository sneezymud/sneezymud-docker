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

import { directionLabels, exitFields, toExitKey } from "./exit-data.tsx";

type ExitFieldUpdate = (field: keyof RoomExit, value: number | string) => void;

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
  onUpdate: ExitFieldUpdate;
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
    <div className="border-border/30 bg-muted/20 space-y-2 rounded border p-3">
      <ExitHeader
        exit={exit}
        onChangeDirection={onChangeDirection}
        onRequestRemove={onRequestRemove}
        prefix={prefix}
        usedDirections={usedDirections}
      />

      <div className="grid grid-cols-[auto_auto_1.5rem] gap-x-3 gap-y-2">
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
    </div>
  );
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
    <div className="flex items-center justify-between pl-2">
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
        className="text-destructive/80 hover:text-destructive shrink-0 hover:cursor-pointer hover:no-underline"
        onClick={onRequestRemove}
        size="xs"
        variant="link"
      >
        Remove
      </Button>
    </div>
  );
}
