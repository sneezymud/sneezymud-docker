import { useState } from "react";

import type { RoomExit } from "@/shared/schemas/room.ts";

import { AddButton } from "@/components/add-button.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useRowKeys } from "@/hooks/use-row-keys.ts";
import { DIRECTION_TYPES } from "@/shared/enums/index.ts";

import { ConfirmDialog } from "./confirm-dialog.tsx";
import { ExitRow } from "./exit-row.tsx";
import { SectionHeader } from "./section-header.tsx";

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

const hasExitData = (exit: RoomExit) =>
  exit.destination !== 0 ||
  exit.name !== "" ||
  exit.description !== "" ||
  exit.condition_flag !== 0;

interface RoomExitsProps {
  exits: RoomExit[];
  onChange: (exits: RoomExit[]) => void;
  vnum: number;
}

export function RoomExits({ exits, onChange, vnum }: RoomExitsProps) {
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

  return (
    <TooltipProvider delayDuration={300}>
      <fieldset className="bg-card border-border/50 rounded-lg border p-5">
        <SectionHeader
          action={
            <AddButton
              aria-label="Add exit"
              disabled={availableDirections.length === 0}
              onClick={addExit}
            />
          }
          title="Exits"
          tooltip={
            <>
              <p>
                Exits define how players move between rooms. Each direction can
                have one exit with an optional door.
              </p>

              <p>
                Exits work immediately from the database without zone file
                entries. However, any door (Type other than None) will be closed
                on every zone reset. A zone file "D" command controls whether a
                door resets as open, closed, or locked.
              </p>
            </>
          }
        />

        <div className="space-y-3">
          {exits.map((exit, index) => (
            <ExitRow
              exit={exit}
              key={rowKeys[index]}
              onChangeDirection={(dir) => {
                changeDirection(index, dir);
              }}
              onRequestRemove={() => {
                if (hasExitData(exit)) {
                  setPendingRemove(index);
                } else {
                  removeExit(index);
                }
              }}
              onUpdate={(field, value) => {
                update(index, field, value);
              }}
              prefix={rowKeys[index] ?? ""}
              usedDirections={usedDirections}
            />
          ))}
        </div>

        <ConfirmDialog
          message="This exit has data (destination, door name, description, or flags). Remove it anyway?"
          onCancel={() => {
            setPendingRemove(null);
          }}
          onConfirm={() => {
            if (pendingRemove !== null) {
              removeExit(pendingRemove);
              setPendingRemove(null);
            }
          }}
          open={pendingRemove !== null}
          title="Remove exit?"
        />
      </fieldset>
    </TooltipProvider>
  );
}
