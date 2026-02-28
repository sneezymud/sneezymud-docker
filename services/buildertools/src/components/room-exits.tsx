import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { RoomExit } from "@/shared/schemas/room.ts";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";
import { useObjectName } from "@/hooks/use-object-name.ts";
import { useRoomName } from "@/hooks/use-room-name.ts";
import {
  DIRECTION_TYPES,
  DOOR_TYPES,
  EXIT_FLAGS,
} from "@/shared/enums/index.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { FieldTooltip } from "./info-tooltip.tsx";
import { NumberInput } from "./number-input.tsx";
import { ObjectPicker } from "./object-picker.tsx";
import { RoomPicker } from "./room-picker.tsx";

const directionLabels = new Map(DIRECTION_TYPES.map((d) => [d.value, d.label]));

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

const doorTypeDetailedTooltip = (
  <div className="space-y-3">
    <p>
      The door type determines the physical form of the barrier, which affects
      available commands, bash resistance, and line of sight. All non-None types
      reduce passage height by 10%.
    </p>
    <table className="w-full text-xs">
      <thead>
        <tr className="border-border border-b">
          <th className="py-1 pr-2 text-left font-semibold">Type</th>
          <th className="py-1 pr-2 text-left font-semibold">Commands</th>
          <th className="py-1 pr-2 text-left font-semibold">Bashable</th>
          <th className="py-1 pr-2 text-left font-semibold">See-through</th>
          <th className="py-1 text-left font-semibold">Notes</th>
        </tr>
      </thead>
      <tbody className="[&_td]:py-1 [&_td]:pr-2">
        <tr className="border-border/50 border-b">
          <td className="font-medium">None</td>
          <td className="text-muted-foreground">N/A</td>
          <td className="text-muted-foreground">N/A</td>
          <td className="text-muted-foreground">N/A</td>
          <td>Open passage, no barrier</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Door</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>No</td>
          <td>Only type with sound effects</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Trapdoor</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>No</td>
          <td>Direction-aware (ceiling/floor)</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Gate</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>No</td>
          <td>"Unlatch and swing" messages</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Grate</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>Yes</td>
          <td>Direction-aware messages</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Portcullis</td>
          <td>raise/lower</td>
          <td>No</td>
          <td>Yes</td>
          <td>"Lowered" when closed</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Drawbridge</td>
          <td>raise/lower</td>
          <td>No</td>
          <td>No</td>
          <td>Raise = close (inverted)</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Rubble</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>No</td>
          <td>"Push aside" messages</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Panel</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>No</td>
          <td>"Slide open" messages</td>
        </tr>
        <tr className="border-border/50 border-b">
          <td className="font-medium">Screen</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>Yes</td>
          <td>"Slide open" messages</td>
        </tr>
        <tr>
          <td className="font-medium">Hatch</td>
          <td>open/close</td>
          <td>Yes</td>
          <td>No</td>
          <td>Direction-aware (ceiling/floor)</td>
        </tr>
      </tbody>
    </table>
  </div>
);

interface RoomExitsProps {
  exits: RoomExit[];
  onChange: (exits: RoomExit[]) => void;
  vnum: number;
}

export function RoomExits({ exits, onChange, vnum }: RoomExitsProps) {
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    exits.map(() => crypto.randomUUID()),
  );
  const [lastRowCount, setLastRowCount] = useState(exits.length);

  if (exits.length !== lastRowCount) {
    setLastRowCount(exits.length);
    if (exits.length > rowKeys.length) {
      const extra = Array.from({ length: exits.length - rowKeys.length }, () =>
        crypto.randomUUID(),
      );
      setRowKeys([...rowKeys, ...extra]);
    } else if (exits.length < rowKeys.length) {
      setRowKeys(rowKeys.slice(0, exits.length));
    }
  }

  const usedDirections = new Set(exits.map((e) => e.direction));
  const availableDirections = DIRECTION_TYPES.filter(
    (d) => !usedDirections.has(d.value),
  );

  const addExit = () => {
    const dir = availableDirections[0];
    if (!dir) {
      return;
    }
    setRowKeys((prev) => [...prev, crypto.randomUUID()]);
    const next = [
      ...exits,
      {
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
      },
    ];
    next.sort((a, b) => a.direction - b.direction);
    onChange(next);
  };

  const removeExit = (index: number) => {
    setRowKeys((prev) => prev.filter((_, i) => i !== index));
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
      <fieldset className="p-4 shadow-sm">
        <legend className="text-foreground flex w-full items-center gap-2 text-lg font-semibold">
          <span>Exits</span>
          <FieldTooltip label="Exits">
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
          </FieldTooltip>
          <Button
            className="ml-auto border-dashed"
            disabled={availableDirections.length === 0}
            onClick={addExit}
            size="sm"
            variant="outline"
          >
            + Add
          </Button>
        </legend>
        <div className="space-y-3">
          {exits.map((exit, index) => {
            const prefix = `exit-${index}`;
            return (
              <div
                className="border-border/30 bg-muted/20 space-y-2 rounded border p-3"
                key={rowKeys[index]}
              >
                <div className="flex items-center justify-between">
                  <div className="w-36 shrink-0">
                    <Select
                      onValueChange={(v) => {
                        changeDirection(index, Number(v));
                      }}
                      value={String(exit.direction)}
                    >
                      <SelectTrigger id={`${prefix}-dir`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {DIRECTION_TYPES.filter(
                          (d) =>
                            d.value === exit.direction ||
                            !usedDirections.has(d.value),
                        ).map((d) => (
                          <SelectItem
                            key={d.value}
                            value={String(d.value)}
                          >
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    aria-label={`Remove ${directionLabels.get(exit.direction) ?? ""} exit`}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => {
                      if (hasExitData(exit)) {
                        setPendingRemove(index);
                      } else {
                        removeExit(index);
                      }
                    }}
                    size="xs"
                    variant="ghost"
                  >
                    Remove
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`${prefix}-name`}>
                    Door name
                    <FieldTooltip label="Door name">
                      <p>
                        The first word becomes the display name in game messages
                        (e.g., "You open the <strong>gate</strong> north.").
                        Additional space-separated words are aliases (e.g.,
                        "gate large" lets players type "open gate" or "open
                        large"). All lowercase.
                      </p>
                      <p>
                        If the first word ends in 's', the game uses plural
                        grammar ("The doors <strong>are</strong> closed"). If
                        empty, defaults to "door".
                      </p>
                    </FieldTooltip>
                  </Label>
                  <Input
                    className="px-2 py-1 disabled:opacity-30"
                    id={`${prefix}-name`}
                    onChange={(e) => {
                      update(index, "name", e.target.value);
                    }}
                    type="text"
                    value={exit.name}
                  />
                </div>
                <div>
                  <Label htmlFor={`${prefix}-desc`}>
                    Description
                    <FieldTooltip label="Description">
                      <p>
                        Shown when a player types "look [direction]" and the way
                        is visible (exit is open, or door type is see-through
                        like grate, portcullis, or screen). If empty, the
                        destination room's name is shown instead.
                      </p>
                      <p>
                        Write as a full sentence. Examples: "The hallway
                        stretches into darkness." or "Through the gate you can
                        see a courtyard."
                      </p>
                    </FieldTooltip>
                  </Label>
                  <Textarea
                    className="min-h-27 resize-y px-2 py-1 disabled:opacity-30"
                    id={`${prefix}-desc`}
                    onChange={(e) => {
                      update(index, "description", e.target.value);
                    }}
                    value={exit.description}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`${prefix}-dest`}>Destination</Label>
                    <RoomPicker
                      id={`${prefix}-dest`}
                      onChange={(v) => {
                        update(index, "destination", v);
                      }}
                      value={exit.destination}
                    />
                    <DestinationPreview vnum={exit.destination} />
                  </div>
                  <div>
                    <Label htmlFor={`${prefix}-type`}>
                      Type
                      <FieldTooltip
                        detailedTooltip={doorTypeDetailedTooltip}
                        label="Door Type Reference"
                      >
                        <p>
                          Determines the physical form of the barrier. Affects
                          commands, bashability, and line of sight. All non-None
                          types reduce passage height by 10%.
                        </p>
                      </FieldTooltip>
                    </Label>
                    <EnumSelect
                      entries={DOOR_TYPES}
                      id={`${prefix}-type`}
                      onChange={(v) => {
                        update(index, "type", v);
                      }}
                      value={exit.type}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={`${prefix}-lock`}>
                      Lock diff.
                      <FieldTooltip label="Lock Difficulty">
                        <p>
                          How hard the lock is to pick and bash (0-100). Also
                          determines whether a shaman's Shadow Walk can pass
                          through: succeeds when the caster's skill exceeds this
                          value.
                        </p>
                        <p>
                          <strong>Picking:</strong> 0 = trivially easy (never
                          jams, instant pick). 25 = easy. 50 = moderate (trained
                          thief). 75 = very hard. 100 = unpickable (sentinel -
                          picking always fails).
                        </p>
                        <p>
                          <strong>Doorbash:</strong> The bash check compares 2x
                          lock difficulty against the basher's skill. At 51+,
                          doorbash auto-fails even for a max-skill character. At
                          50 or below, bash success also depends on door weight.
                        </p>
                        <p>
                          <strong>Shadow Walk:</strong> A shaman with maximum
                          training (~85 skill) can walk through doors with lock
                          difficulty up to 84. At 85+, even max-trained shamans
                          are blocked.
                        </p>
                      </FieldTooltip>
                    </Label>
                    <NumberInput
                      className="px-2 py-1 disabled:opacity-30"
                      id={`${prefix}-lock`}
                      max={100}
                      min={0}
                      onValueChange={(v) => {
                        update(index, "lock_difficulty", v);
                      }}
                      value={exit.lock_difficulty}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`${prefix}-weight`}>
                      Weight
                      <FieldTooltip label="Door Weight">
                        <p>
                          How heavy the door is (1-50). Affects opening, bash
                          difficulty, and bash self-damage.
                        </p>
                        <p>
                          <strong>Opening:</strong> Compared against character
                          Strength. Average STR (105) can open doors up to
                          weight ~48. Max STR (205) can open any door.
                        </p>
                        <p>
                          <strong>Bashing hard-stop:</strong> The bash check
                          doubles the weight. Average-STR characters auto-fail
                          at weight 25+. Max-STR can always attempt (even weight
                          50).
                        </p>
                        <p>
                          <strong>Bash success</strong> (lock difficulty 0): Max
                          stats (skill 100, BRA 205) - weight 10: 100%, weight
                          25: 40%, weight 50: 20%. Average BRA (105) halves
                          these chances.
                        </p>
                        <p>
                          <strong>Self-damage:</strong> Successful bash deals ~4
                          avg damage per weight point. Weight 25 = ~100 avg.
                          Weight 50 = ~200 avg.
                        </p>
                      </FieldTooltip>
                    </Label>
                    <NumberInput
                      className="px-2 py-1 disabled:opacity-30"
                      id={`${prefix}-weight`}
                      max={50}
                      min={1}
                      onValueChange={(v) => {
                        update(index, "weight", v);
                      }}
                      value={exit.weight}
                    />
                  </div>
                </div>

                <div className="w-1/2">
                  <Label htmlFor={`${prefix}-key`}>
                    Key vnum
                    <FieldTooltip label="Key Vnum">
                      <p>
                        Object vnum of the key that unlocks this door. Use -1
                        for "no keyhole" - players cannot use a key but can
                        still pick the lock. Positive value should reference a
                        valid key object.
                      </p>
                      <p>
                        If set to -1 on a locked exit, the only way through is
                        lock picking (if difficulty &lt; 100) or Shadow Walk.
                      </p>
                    </FieldTooltip>
                  </Label>
                  <ObjectPicker
                    id={`${prefix}-key`}
                    min={-1}
                    onChange={(v) => {
                      update(index, "key_num", v);
                    }}
                    value={exit.key_num}
                  />
                  <KeyPreview vnum={exit.key_num} />
                </div>

                <div>
                  <Label htmlFor={`${prefix}-cond`}>Condition Flags</Label>
                  <BitfieldEditor
                    entries={EXIT_FLAGS}
                    id={`${prefix}-cond`}
                    label="Condition Flags"
                    onChange={(v) => {
                      update(index, "condition_flag", v);
                    }}
                    value={exit.condition_flag}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <ConfirmDialog
          confirmLabel="Remove exit"
          message={
            pendingRemove === null
              ? ""
              : `Remove the ${(directionLabels.get(exits[pendingRemove]?.direction ?? 0) ?? "").toLowerCase()} exit? This will discard all exit data.`
          }
          onCancel={() => {
            setPendingRemove(null);
          }}
          onConfirm={() => {
            if (pendingRemove !== null) {
              removeExit(pendingRemove);
            }
            setPendingRemove(null);
          }}
          open={pendingRemove !== null}
          title="Remove Exit"
          variant="danger"
        />
      </fieldset>
    </TooltipProvider>
  );
}

function DestinationPreview({ vnum }: { vnum: number }) {
  const { data } = useRoomName(vnum);

  if (!data?.name) {
    return null;
  }

  return (
    <Link
      className="text-muted-foreground hover:text-foreground mt-0.5 block truncate text-xs"
      params={{ vnum: String(vnum) }}
      to="/rooms/$vnum"
    >
      {data.name}
    </Link>
  );
}

function KeyPreview({ vnum }: { vnum: number }) {
  const { data } = useObjectName(vnum);

  if (!data?.name) {
    return null;
  }

  return (
    <Link
      className="text-muted-foreground hover:text-foreground mt-0.5 block truncate text-xs"
      params={{ vnum: String(vnum) }}
      to="/objects/$vnum"
    >
      {data.name}
    </Link>
  );
}
