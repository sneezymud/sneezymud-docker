import { Link } from "@tanstack/react-router";

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
import { useObjectName } from "@/hooks/use-object-name.ts";
import { useRoomName } from "@/hooks/use-room-name.ts";
import {
  DIRECTION_TYPES,
  DOOR_TYPES,
  EXIT_FLAGS,
} from "@/shared/enums/index.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { FieldTooltip } from "./info-tooltip.tsx";
import { NumberInput } from "./number-input.tsx";
import { ObjectPicker } from "./object-picker.tsx";
import { RoomPicker } from "./room-picker.tsx";

type ExitFieldUpdate = (field: keyof RoomExit, value: number | string) => void;

export function ExitRow({
  exit,
  index,
  onChangeDirection,
  onRequestRemove,
  onUpdate,
  usedDirections,
}: {
  exit: RoomExit;
  index: number;
  onChangeDirection: (newDirection: number) => void;
  onRequestRemove: () => void;
  onUpdate: ExitFieldUpdate;
  usedDirections: Set<number>;
}) {
  const prefix = `exit-${index}`;
  return (
    <div className="border-border/30 bg-muted/20 space-y-2 rounded border p-3">
      <ExitHeader
        exit={exit}
        onChangeDirection={onChangeDirection}
        onRequestRemove={onRequestRemove}
        prefix={prefix}
        usedDirections={usedDirections}
      />
      <DoorNameField
        onUpdate={onUpdate}
        prefix={prefix}
        value={exit.name}
      />
      <ExitDescriptionField
        onUpdate={onUpdate}
        prefix={prefix}
        value={exit.description}
      />
      <div className="grid grid-cols-2 gap-2">
        <DestinationField
          onUpdate={onUpdate}
          prefix={prefix}
          value={exit.destination}
        />
        <DoorTypeField
          onUpdate={onUpdate}
          prefix={prefix}
          value={exit.type}
        />
      </div>
      <DoorLockFields
        lockDifficulty={exit.lock_difficulty}
        onUpdate={onUpdate}
        prefix={prefix}
        weight={exit.weight}
      />
      <KeyVnumField
        onUpdate={onUpdate}
        prefix={prefix}
        value={exit.key_num}
      />
      <ConditionFlagsField
        onUpdate={onUpdate}
        prefix={prefix}
        value={exit.condition_flag}
      />
    </div>
  );
}

function ExitHeader({
  exit,
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
      <div className="w-36 shrink-0">
        <Select
          onValueChange={(v) => {
            onChangeDirection(Number(v));
          }}
          value={String(exit.direction)}
        >
          <SelectTrigger id={`${prefix}-dir`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {DIRECTION_TYPES.filter(
              (d) => d.value === exit.direction || !usedDirections.has(d.value),
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
        onClick={onRequestRemove}
        size="xs"
        variant="ghost"
      >
        Remove
      </Button>
    </div>
  );
}

function ConditionFlagsField({
  onUpdate,
  prefix,
  value,
}: {
  onUpdate: ExitFieldUpdate;
  prefix: string;
  value: number;
}) {
  return (
    <div>
      <Label htmlFor={`${prefix}-cond`}>Condition Flags</Label>
      <BitfieldEditor
        entries={EXIT_FLAGS}
        id={`${prefix}-cond`}
        label="Condition Flags"
        onChange={(v) => {
          onUpdate("condition_flag", v);
        }}
        value={value}
      />
    </div>
  );
}

function DoorNameField({
  onUpdate,
  prefix,
  value,
}: {
  onUpdate: ExitFieldUpdate;
  prefix: string;
  value: string;
}) {
  return (
    <div>
      <Label htmlFor={`${prefix}-name`}>
        Door name
        <FieldTooltip label="Door name">
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
        </FieldTooltip>
      </Label>
      <Input
        className="px-2 py-1 disabled:opacity-30"
        id={`${prefix}-name`}
        onChange={(e) => {
          onUpdate("name", e.target.value);
        }}
        type="text"
        value={value}
      />
    </div>
  );
}

function ExitDescriptionField({
  onUpdate,
  prefix,
  value,
}: {
  onUpdate: ExitFieldUpdate;
  prefix: string;
  value: string;
}) {
  return (
    <div>
      <Label htmlFor={`${prefix}-desc`}>
        Description
        <FieldTooltip label="Description">
          <p>
            Shown when a player types "look [direction]" and the way is visible
            (exit is open, or door type is see-through like grate, portcullis,
            or screen). If empty, the destination room's name is shown instead.
          </p>
          <p>
            Write as a full sentence. Examples: "The hallway stretches into
            darkness." or "Through the gate you can see a courtyard."
          </p>
        </FieldTooltip>
      </Label>
      <Textarea
        className="min-h-27 resize-y px-2 py-1 disabled:opacity-30"
        id={`${prefix}-desc`}
        onChange={(e) => {
          onUpdate("description", e.target.value);
        }}
        value={value}
      />
    </div>
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

function DestinationField({
  onUpdate,
  prefix,
  value,
}: {
  onUpdate: ExitFieldUpdate;
  prefix: string;
  value: number;
}) {
  return (
    <div>
      <Label htmlFor={`${prefix}-dest`}>Destination</Label>
      <RoomPicker
        id={`${prefix}-dest`}
        onChange={(v) => {
          onUpdate("destination", v);
        }}
        value={value}
      />
      <DestinationPreview vnum={value} />
    </div>
  );
}

function DoorTypeField({
  onUpdate,
  prefix,
  value,
}: {
  onUpdate: ExitFieldUpdate;
  prefix: string;
  value: number;
}) {
  return (
    <div>
      <Label htmlFor={`${prefix}-type`}>
        Type
        <FieldTooltip
          detailedTooltip={doorTypeDetailedTooltip}
          label="Door Type Reference"
        >
          <p>
            Determines the physical form of the barrier. Affects commands,
            bashability, and line of sight. All non-None types reduce passage
            height by 10%.
          </p>
        </FieldTooltip>
      </Label>
      <EnumSelect
        entries={DOOR_TYPES}
        id={`${prefix}-type`}
        onChange={(v) => {
          onUpdate("type", v);
        }}
        value={value}
      />
    </div>
  );
}

function DoorLockFields({
  lockDifficulty,
  onUpdate,
  prefix,
  weight,
}: {
  lockDifficulty: number;
  onUpdate: ExitFieldUpdate;
  prefix: string;
  weight: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label htmlFor={`${prefix}-lock`}>
          Lock diff.
          <FieldTooltip label="Lock Difficulty">
            <p>
              How hard the lock is to pick and bash (0-100). Also determines
              whether a shaman's Shadow Walk can pass through: succeeds when the
              caster's skill exceeds this value.
            </p>
            <p>
              <strong>Picking:</strong> 0 = trivially easy (never jams, instant
              pick). 25 = easy. 50 = moderate (trained thief). 75 = very hard.
              100 = unpickable (sentinel - picking always fails).
            </p>
            <p>
              <strong>Doorbash:</strong> The bash check compares 2x lock
              difficulty against the basher's skill. At 51+, doorbash auto-fails
              even for a max-skill character. At 50 or below, bash success also
              depends on door weight.
            </p>
            <p>
              <strong>Shadow Walk:</strong> A shaman with maximum training (~85
              skill) can walk through doors with lock difficulty up to 84. At
              85+, even max-trained shamans are blocked.
            </p>
          </FieldTooltip>
        </Label>
        <NumberInput
          className="px-2 py-1 disabled:opacity-30"
          id={`${prefix}-lock`}
          max={100}
          min={0}
          onValueChange={(v) => {
            onUpdate("lock_difficulty", v);
          }}
          value={lockDifficulty}
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}-weight`}>
          Weight
          <FieldTooltip label="Door Weight">
            <p>
              How heavy the door is (1-50). Affects opening, bash difficulty,
              and bash self-damage.
            </p>
            <p>
              <strong>Opening:</strong> Compared against character Strength.
              Average STR (105) can open doors up to weight ~48. Max STR (205)
              can open any door.
            </p>
            <p>
              <strong>Bashing hard-stop:</strong> The bash check doubles the
              weight. Average-STR characters auto-fail at weight 25+. Max-STR
              can always attempt (even weight 50).
            </p>
            <p>
              <strong>Bash success</strong> (lock difficulty 0): Max stats
              (skill 100, BRA 205) - weight 10: 100%, weight 25: 40%, weight 50:
              20%. Average BRA (105) halves these chances.
            </p>
            <p>
              <strong>Self-damage:</strong> Successful bash deals ~4 avg damage
              per weight point. Weight 25 = ~100 avg. Weight 50 = ~200 avg.
            </p>
          </FieldTooltip>
        </Label>
        <NumberInput
          className="px-2 py-1 disabled:opacity-30"
          id={`${prefix}-weight`}
          max={50}
          min={1}
          onValueChange={(v) => {
            onUpdate("weight", v);
          }}
          value={weight}
        />
      </div>
    </div>
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

function KeyVnumField({
  onUpdate,
  prefix,
  value,
}: {
  onUpdate: ExitFieldUpdate;
  prefix: string;
  value: number;
}) {
  return (
    <div className="w-1/2">
      <Label htmlFor={`${prefix}-key`}>
        Key vnum
        <FieldTooltip label="Key Vnum">
          <p>
            Object vnum of the key that unlocks this door. Use -1 for "no
            keyhole" - players cannot use a key but can still pick the lock.
            Positive value should reference a valid key object.
          </p>
          <p>
            If set to -1 on a locked exit, the only way through is lock picking
            (if difficulty &lt; 100) or Shadow Walk.
          </p>
        </FieldTooltip>
      </Label>
      <ObjectPicker
        id={`${prefix}-key`}
        min={-1}
        onChange={(v) => {
          onUpdate("key_num", v);
        }}
        value={value}
      />
      <KeyPreview vnum={value} />
    </div>
  );
}

const directionLabels = new Map(DIRECTION_TYPES.map((d) => [d.value, d.label]));

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
