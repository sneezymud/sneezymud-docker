import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useRef, useState } from "react";

import type { RoomExit } from "@/shared/schemas/room.ts";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useRoomName } from "@/hooks/use-room-name.ts";
import { cn } from "@/lib/utils.ts";
import { DOOR_TYPES, EXIT_FLAGS } from "@/shared/enums/index.ts";

import { BitfieldEditor } from "./bitfield-editor.tsx";
import { ConfirmDialog } from "./confirm-dialog.tsx";
import { EnumSelect } from "./enum-select.tsx";
import { NumberInput } from "./number-input.tsx";
import { RoomPicker } from "./room-picker.tsx";

const DIRECTIONS = ["North", "East", "South", "West", "Up", "Down"];

interface RoomExitsProps {
  exits: RoomExit[];
  onChange: (exits: RoomExit[]) => void;
  vnum: number;
}

export function RoomExits({ exits, onChange, vnum }: RoomExitsProps) {
  const exitByDirection = new Map(exits.map((e) => [e.direction, e]));

  const setExit = (direction: number, exit: null | RoomExit) => {
    const next = exits.filter((e) => e.direction !== direction);
    if (exit) {
      next.push(exit);
    }
    next.sort((a, b) => a.direction - b.direction);
    onChange(next);
  };

  return (
    <fieldset className="border-border rounded border p-4">
      <legend className="text-foreground px-2 text-base font-semibold">
        Exits
      </legend>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {DIRECTIONS.map((dirName, direction) => (
          <ExitSlot
            direction={direction}
            exit={exitByDirection.get(direction) ?? null}
            key={dirName}
            name={dirName}
            onChange={(exit) => {
              setExit(direction, exit);
            }}
            vnum={vnum}
          />
        ))}
      </div>
    </fieldset>
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

function ExitSlot({
  direction,
  exit,
  name,
  onChange,
  vnum,
}: {
  direction: number;
  exit: null | RoomExit;
  name: string;
  onChange: (exit: null | RoomExit) => void;
  vnum: number;
}) {
  const enabled = exit !== null;
  const prefix = `exit-${direction}`;
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);

  const hasExitData =
    exit !== null &&
    (exit.destination !== 0 ||
      exit.name !== "" ||
      exit.description !== "" ||
      exit.condition_flag !== 0);

  const toggle = () => {
    if (enabled) {
      if (hasExitData) {
        setShowRemoveConfirm(true);
      } else {
        onChange(null);
      }
    } else {
      // Focus destination input after React renders the exit fields
      requestAnimationFrame(() => {
        destRef.current?.querySelector("input")?.focus();
      });
      onChange({
        block: 0,
        condition_flag: 0,
        description: "",
        destination: 0,
        direction,
        key_num: 0,
        lock_difficulty: 0,
        name: "",
        type: 0,
        vnum,
        weight: 0,
      });
    }
  };

  const update = (field: keyof RoomExit, value: number | string) => {
    if (!exit) {
      return;
    }
    onChange({ ...exit, [field]: value });
  };

  return (
    <div
      className={cn(
        "border-border/30 bg-muted/20 rounded border p-3 transition-shadow hover:shadow-md hover:shadow-black/20",
        enabled
          ? "border-l-accent border-l-2"
          : "border-l-2 border-l-transparent",
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">{name}</span>
        <div className="flex items-center gap-1.5">
          <Checkbox
            checked={enabled}
            id={`${prefix}-enabled`}
            onCheckedChange={toggle}
          />
          <Label
            className="text-muted-foreground cursor-pointer text-xs font-normal"
            htmlFor={`${prefix}-enabled`}
          >
            Has exit
          </Label>
        </div>
      </div>

      {enabled ? (
        <div className="grid grid-cols-2 gap-2">
          <div ref={destRef}>
            <div className="flex items-center gap-1">
              <Label htmlFor={`${prefix}-dest`}>Destination</Label>
              {exit.destination > 0 ? (
                <Link
                  className="text-muted-foreground hover:text-foreground"
                  params={{ vnum: String(exit.destination) }}
                  title={`Go to room ${exit.destination}`}
                  to="/rooms/$vnum"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
            <RoomPicker
              id={`${prefix}-dest`}
              onChange={(v) => {
                update("destination", v);
              }}
              value={exit.destination}
            />
            <DestinationPreview vnum={exit.destination} />
          </div>
          <div>
            <Label htmlFor={`${prefix}-type`}>Type</Label>
            <EnumSelect
              entries={DOOR_TYPES}
              id={`${prefix}-type`}
              onChange={(v) => {
                update("type", v);
              }}
              value={exit.type}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor={`${prefix}-name`}>Door name</Label>
            <Input
              className="px-2 py-1 disabled:opacity-30"
              id={`${prefix}-name`}
              onChange={(e) => {
                update("name", e.target.value);
              }}
              type="text"
              value={exit.name}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor={`${prefix}-desc`}>Description</Label>
            <Textarea
              className="min-h-[40px] resize-y px-2 py-1 disabled:opacity-30"
              id={`${prefix}-desc`}
              onChange={(e) => {
                update("description", e.target.value);
              }}
              value={exit.description}
            />
          </div>
          <div>
            <Label htmlFor={`${prefix}-lock`}>Lock difficulty</Label>
            <NumberInput
              className="px-2 py-1 disabled:opacity-30"
              id={`${prefix}-lock`}
              onValueChange={(v) => {
                update("lock_difficulty", v);
              }}
              value={exit.lock_difficulty}
            />
          </div>
          <div>
            <Label htmlFor={`${prefix}-key`}>Key vnum</Label>
            <NumberInput
              className="px-2 py-1 disabled:opacity-30"
              id={`${prefix}-key`}
              onValueChange={(v) => {
                update("key_num", v);
              }}
              value={exit.key_num}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor={`${prefix}-cond`}>Condition Flags</Label>
            <BitfieldEditor
              entries={EXIT_FLAGS}
              id={`${prefix}-cond`}
              label="Condition Flags"
              onChange={(v) => {
                update("condition_flag", v);
              }}
              value={exit.condition_flag}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Remove exit"
        message={`Remove the ${name.toLowerCase()} exit? This will discard all exit data.`}
        onCancel={() => {
          setShowRemoveConfirm(false);
        }}
        onConfirm={() => {
          setShowRemoveConfirm(false);
          onChange(null);
        }}
        open={showRemoveConfirm}
        title="Remove Exit"
        variant="danger"
      />
    </div>
  );
}
