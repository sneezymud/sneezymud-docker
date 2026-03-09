import type { RoomExit } from "@/shared/schemas/room.ts";
import type { FieldDef } from "@/shared/types/entity-form.ts";

import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  DIRECTION_TYPES,
  DOOR_TYPES,
  EXIT_FLAGS,
} from "@/shared/enums/index.ts";

import { FormField } from "./form-field.tsx";

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

function toExitKey(fieldKey: string, prefix: string): keyof RoomExit {
  const suffix = fieldKey.slice(prefix.length + 1);
  const key = exitKeys[suffix];
  if (key === undefined) {
    throw new Error(`Unknown exit field key: ${suffix}`);
  }
  return key;
}

function exitFields(prefix: string): FieldDef[] {
  return [
    {
      fullWidth: true,
      key: `${prefix}-name`,
      label: "Door name",
      tooltip: (
        <>
          <p>
            The first word becomes the display name in game messages (e.g., "You
            open the <strong>gate</strong> north."). Additional space-separated
            words are aliases (e.g., "gate large" lets players type "open gate"
            or "open large"). All lowercase.
          </p>

          <p>
            If the first word ends in 's', the game uses plural grammar ("The
            doors <strong>are</strong> closed"). If empty, defaults to "door".
          </p>
        </>
      ),
      type: "text",
    },
    {
      key: `${prefix}-description`,
      label: "Description",
      tooltip: (
        <>
          <p>
            Shown when a player types "look [direction]" and the way is visible
            (exit is open, or door type is see-through like grate, portcullis,
            or screen). If empty, the destination room's name is shown instead.
          </p>

          <p>
            Write as a full sentence. Examples: "The hallway stretches into
            darkness." or "Through the gate you can see a courtyard."
          </p>
        </>
      ),
      type: "textarea",
    },
    {
      fullWidth: true,
      key: `${prefix}-destination`,
      label: "Destination",
      type: "room",
    },
    {
      detailedTooltip: doorTypeDetailedTooltip,
      enumEntries: DOOR_TYPES,
      fullWidth: true,
      key: `${prefix}-type`,
      label: "Type",
      tooltip: (
        <p>
          Determines the physical form of the barrier. Affects commands,
          bashability, and line of sight. All non-None types reduce passage
          height by 10%.
        </p>
      ),
      type: "enum",
    },
    {
      fullWidth: true,
      key: `${prefix}-lock_difficulty`,
      label: "Lock Difficulty",
      max: 100,
      min: 0,
      tooltip: (
        <>
          <p>
            How hard the lock is to pick and bash (0-100). Also determines
            whether a shaman's Shadow Walk can pass through: succeeds when the
            caster's skill exceeds this value.
          </p>

          <p>
            <strong>Picking:</strong> 0 = trivially easy (never jams, instant
            pick). 25 = easy. 50 = moderate (trained thief). 75 = very hard. 100
            = unpickable (sentinel - picking always fails).
          </p>

          <p>
            <strong>Doorbash:</strong> The bash check compares 2x lock
            difficulty against the basher's skill. At 51+, doorbash auto-fails
            even for a max-skill character. At 50 or below, bash success also
            depends on door weight.
          </p>

          <p>
            <strong>Shadow Walk:</strong> A shaman with maximum training (~85
            skill) can walk through doors with lock difficulty up to 84. At 85+,
            even max-trained shamans are blocked.
          </p>
        </>
      ),
      type: "number",
    },
    {
      fullWidth: true,
      key: `${prefix}-weight`,
      label: "Weight",
      max: 50,
      min: 1,
      tooltip: (
        <>
          <p>
            How heavy the door is (1-50). Affects opening, bash difficulty, and
            bash self-damage.
          </p>

          <p>
            <strong>Opening:</strong> Compared against character Strength.
            Average STR (105) can open doors up to weight ~48. Max STR (205) can
            open any door.
          </p>

          <p>
            <strong>Bashing hard-stop:</strong> The bash check doubles the
            weight. Average-STR characters auto-fail at weight 25+. Max-STR can
            always attempt (even weight 50).
          </p>

          <p>
            <strong>Bash success</strong> (lock difficulty 0): Max stats (skill
            100, BRA 205) - weight 10: 100%, weight 25: 40%, weight 50: 20%.
            Average BRA (105) halves these chances.
          </p>

          <p>
            <strong>Self-damage:</strong> Successful bash deals ~4 avg damage
            per weight point. Weight 25 = ~100 avg. Weight 50 = ~200 avg.
          </p>
        </>
      ),
      type: "number",
    },
    {
      fullWidth: true,
      key: `${prefix}-key_num`,
      label: "Key VNum",
      min: -1,
      tooltip: (
        <>
          <p>
            Object vnum of the key that unlocks this door. Use -1 for "no
            keyhole" - players cannot use a key but can still pick the lock.
            Positive value should reference a valid key object.
          </p>

          <p>
            If set to -1 on a locked exit, the only way through is lock picking
            (if difficulty &lt; 100) or Shadow Walk.
          </p>
        </>
      ),
      type: "object",
    },
    {
      bitfieldEntries: EXIT_FLAGS,
      key: `${prefix}-condition_flag`,
      label: "Condition Flags",
      type: "bitfield",
    },
  ];
}

function boolCell(value: boolean | null) {
  if (value === null) return <td className="text-muted-foreground">N/A</td>;
  return <td>{value ? "Yes" : "No"}</td>;
}

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

const directionLabels = new Map(
  DIRECTION_TYPES.map(({ label, value }) => [value, label]),
);

const doorTypeDetails = [
  {
    bashable: null,
    commands: null,
    name: "None",
    notes: "Open passage, no barrier",
    seeThrough: null,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Door",
    notes: "Only type with sound effects",
    seeThrough: false,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Trapdoor",
    notes: "Direction-aware (ceiling/floor)",
    seeThrough: false,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Gate",
    notes: '"Unlatch and swing" messages',
    seeThrough: false,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Grate",
    notes: "Direction-aware messages",
    seeThrough: true,
  },
  {
    bashable: false,
    commands: "raise/lower",
    name: "Portcullis",
    notes: '"Lowered" when closed',
    seeThrough: true,
  },
  {
    bashable: false,
    commands: "raise/lower",
    name: "Drawbridge",
    notes: "Raise = close (inverted)",
    seeThrough: false,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Rubble",
    notes: '"Push aside" messages',
    seeThrough: false,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Panel",
    notes: '"Slide open" messages',
    seeThrough: false,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Screen",
    notes: '"Slide open" messages',
    seeThrough: true,
  },
  {
    bashable: true,
    commands: "open/close",
    name: "Hatch",
    notes: "Direction-aware (ceiling/floor)",
    seeThrough: false,
  },
];

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
          {["Type", "Commands", "Bashable", "See-through", "Notes"].map(
            (header) => (
              <th
                className="py-1 pr-2 text-left font-semibold last:pr-0"
                key={header}
              >
                {header}
              </th>
            ),
          )}
        </tr>
      </thead>

      <tbody className="[&_td]:py-1 [&_td]:pr-2">
        {doorTypeDetails.map(
          ({ bashable, commands, name, notes, seeThrough }) => (
            <tr
              className="border-border/50 border-b last:border-b-0"
              key={name}
            >
              <td className="font-medium">{name}</td>

              {commands ? (
                <td>{commands}</td>
              ) : (
                <td className="text-muted-foreground">N/A</td>
              )}

              {boolCell(bashable)}
              {boolCell(seeThrough)}
              <td>{notes}</td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  </div>
);
