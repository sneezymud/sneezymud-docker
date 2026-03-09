import { useState } from "react";

import type { RoomExit } from "@/shared/schemas/room.ts";

import { useRowKeys } from "@/hooks/use-row-keys.ts";
import { DIRECTION_TYPES } from "@/shared/enums/index.ts";

// Bit constants for exit condition flags
const EXIT_CLOSED = Math.trunc(1);
const EXIT_LOCKED = 1 << 1;
const EXIT_SECRET = 1 << 2;
const EXIT_DESTROYED = 1 << 3;
const EXIT_CAVED_IN = 1 << 6;
const EXIT_SLOPED_UP = 1 << 8;
const EXIT_SLOPED_DOWN = 1 << 9;

/** Enforce mutual exclusivity rules matching C++ redit (create_rooms.cc) */
function enforceExitFlagRules(oldFlags: number, newFlags: number): number {
  const toggled = oldFlags ^ newFlags;
  const turnedOn = toggled & newFlags;
  let flags = newFlags;

  if (turnedOn & EXIT_DESTROYED) {
    flags &= ~(EXIT_CLOSED | EXIT_LOCKED | EXIT_SECRET);
  }

  if (turnedOn & EXIT_CAVED_IN) {
    flags |= EXIT_CLOSED;
    flags &= ~(EXIT_LOCKED | EXIT_SECRET);
  }

  if (turnedOn & EXIT_SLOPED_UP) {
    flags &= ~EXIT_SLOPED_DOWN;
  }

  if (turnedOn & EXIT_SLOPED_DOWN) {
    flags &= ~EXIT_SLOPED_UP;
  }

  return flags;
}

export const hasExitData = (exit: RoomExit) =>
  exit.destination !== 0 ||
  exit.name !== "" ||
  exit.description !== "" ||
  exit.condition_flag !== 0;

export function useExitEditor(
  exits: RoomExit[],
  onChange: (exits: RoomExit[]) => void,
  vnum: number,
) {
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);
  const { removeKey, rowKeys, setRowKeys } = useRowKeys(exits.length);

  const usedDirections = new Set(exits.map((e) => e.direction));
  const availableDirections = DIRECTION_TYPES.filter(
    (d) => !usedDirections.has(d.value),
  );

  const addExit = () => {
    const dir = availableDirections[0];
    if (!dir) {
      return;
    }
    const newExit = {
      block: 0,
      condition_flag: 0,
      description: "",
      destination: 0,
      direction: dir.value,
      key_num: -1,
      lock_difficulty: 0,
      name: "",
      type: 0,
      vnum,
      weight: 1,
    };
    const paired = [
      ...exits.map((e, i) => ({ exit: e, key: rowKeys[i] ?? "" })),
      { exit: newExit, key: crypto.randomUUID() },
    ];
    paired.sort((a, b) => a.exit.direction - b.exit.direction);
    onChange(paired.map((p) => p.exit));
    setRowKeys(paired.map((p) => p.key));
  };

  const removeExit = (index: number) => {
    removeKey(index);
    onChange(exits.filter((_, i) => i !== index));
  };

  const update = (
    index: number,
    field: keyof RoomExit,
    value: number | string,
  ) => {
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
  };

  const changeDirection = (index: number, newDirection: number) => {
    const paired = exits.map((e, i) => ({
      exit: i === index ? { ...e, direction: newDirection } : e,
      key: rowKeys[i] ?? "",
    }));
    paired.sort((a, b) => a.exit.direction - b.exit.direction);
    onChange(paired.map((p) => p.exit));
    setRowKeys(paired.map((p) => p.key));
  };

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
