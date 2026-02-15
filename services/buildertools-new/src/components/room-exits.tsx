import type { RoomExit } from "@/shared/schemas/room.ts";

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
    <fieldset className="rounded border border-zinc-700/50 p-4">
      <legend className="px-2 text-sm font-medium text-zinc-300">Exits</legend>
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
  const prefix = `exit-${String(direction)}`;

  const toggle = () => {
    if (enabled) {
      onChange(null);
    } else {
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

  const inputClass =
    "w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-500 disabled:opacity-30";

  return (
    <div className="rounded border border-zinc-700/30 bg-zinc-800/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">{name}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-500">
          <input
            checked={enabled}
            className="accent-zinc-400"
            onChange={toggle}
            type="checkbox"
          />
          {enabled ? "Enabled" : "None"}
        </label>
      </div>

      {enabled ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              className="text-xs text-zinc-500"
              htmlFor={`${prefix}-dest`}
            >
              Destination
            </label>
            <input
              className={inputClass}
              id={`${prefix}-dest`}
              onChange={(e) => {
                update("destination", Number(e.target.value) || 0);
              }}
              type="number"
              value={exit.destination}
            />
          </div>
          <div>
            <label
              className="text-xs text-zinc-500"
              htmlFor={`${prefix}-type`}
            >
              Type
            </label>
            <input
              className={inputClass}
              id={`${prefix}-type`}
              onChange={(e) => {
                update("type", Number(e.target.value) || 0);
              }}
              type="number"
              value={exit.type}
            />
          </div>
          <div className="col-span-2">
            <label
              className="text-xs text-zinc-500"
              htmlFor={`${prefix}-name`}
            >
              Door name
            </label>
            <input
              className={inputClass}
              id={`${prefix}-name`}
              onChange={(e) => {
                update("name", e.target.value);
              }}
              type="text"
              value={exit.name}
            />
          </div>
          <div className="col-span-2">
            <label
              className="text-xs text-zinc-500"
              htmlFor={`${prefix}-desc`}
            >
              Description
            </label>
            <textarea
              className={`${inputClass} min-h-[40px] resize-y`}
              id={`${prefix}-desc`}
              onChange={(e) => {
                update("description", e.target.value);
              }}
              value={exit.description}
            />
          </div>
          <div>
            <label
              className="text-xs text-zinc-500"
              htmlFor={`${prefix}-lock`}
            >
              Lock difficulty
            </label>
            <input
              className={inputClass}
              id={`${prefix}-lock`}
              onChange={(e) => {
                update("lock_difficulty", Number(e.target.value) || 0);
              }}
              type="number"
              value={exit.lock_difficulty}
            />
          </div>
          <div>
            <label
              className="text-xs text-zinc-500"
              htmlFor={`${prefix}-key`}
            >
              Key vnum
            </label>
            <input
              className={inputClass}
              id={`${prefix}-key`}
              onChange={(e) => {
                update("key_num", Number(e.target.value) || 0);
              }}
              type="number"
              value={exit.key_num}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
