import { useState } from "react";

import type { RoomExit } from "@/shared/schemas/room.ts";

import { useRowKeys } from "@/hooks/use-row-keys.ts";
import { DIRECTION_TYPES } from "@/shared/enums/index.ts";
import { enforceExitFlagRules } from "@/shared/exit-flag-rules.ts";

export function hasExitData(exit: RoomExit) {
  return (
    exit.destination !== 0 ||
    exit.name !== "" ||
    exit.description !== "" ||
    exit.condition_flag !== 0
  );
}

export function useExitEditor({
  exits,
  onChange,
  vnum,
}: {
  exits: RoomExit[];
  onChange: (exits: RoomExit[]) => void;
  vnum: number;
}) {
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);
  const { removeKey, rowKeys, setRowKeys } = useRowKeys(exits.length);

  const usedDirections = new Set(exits.map(({ direction }) => direction));
  const availableDirections = DIRECTION_TYPES.filter(
    ({ value }) => !usedDirections.has(value),
  );

  function commitSorted(paired: Array<{ exit: RoomExit; key: string }>) {
    const sorted = paired.toSorted(
      (a, b) => a.exit.direction - b.exit.direction,
    );
    onChange(sorted.map(({ exit }) => exit));
    setRowKeys(sorted.map(({ key }) => key));
  }

  function addExit() {
    const dir = availableDirections[0];
    if (!dir) {
      return;
    }
    commitSorted([
      ...exits.map((exit, i) => ({ exit, key: rowKeys[i] ?? "" })),
      {
        exit: { ...newExit, direction: dir.value, vnum },
        key: crypto.randomUUID(),
      },
    ]);
  }

  function removeExit(index: number) {
    removeKey(index);
    onChange(exits.filter((_, i) => i !== index));
  }

  function update({
    field,
    index,
    value,
  }: {
    field: keyof RoomExit;
    index: number;
    value: number | string;
  }) {
    if (field === "condition_flag" && typeof value === "number") {
      const oldFlags = exits[index]?.condition_flag ?? 0;
      const enforced = enforceExitFlagRules(oldFlags, value);
      onChange(
        exits.map((e, i) =>
          i === index ? { ...e, condition_flag: enforced } : e,
        ),
      );
      return;
    }
    onChange(exits.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  function changeDirection(index: number, newDirection: number) {
    commitSorted(
      exits.map((exit, i) => ({
        exit: i === index ? { ...exit, direction: newDirection } : exit,
        key: rowKeys[i] ?? "",
      })),
    );
  }

  return {
    addExit,
    availableDirections,
    changeDirection,
    pendingRemove,
    removeExit,
    rowKeys,
    setPendingRemove,
    update,
    usedDirections,
  };
}

const newExit = {
  block: 0,
  condition_flag: 0,
  description: "",
  destination: 0,
  key_num: -1,
  lock_difficulty: 0,
  name: "",
  type: 0,
  weight: 1,
} as const;
