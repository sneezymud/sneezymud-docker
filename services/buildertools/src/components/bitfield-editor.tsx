import { useState } from "react";

import type { BitfieldEntry } from "@/shared/enums/types.ts";

interface BitfieldEditorProps {
  entries: BitfieldEntry[];
  id?: string;
  onChange: (value: number) => void;
  value: number;
}

export function BitfieldEditor({
  entries,
  id,
  onChange,
  value,
}: BitfieldEditorProps) {
  const [collapsed, setCollapsed] = useState(true);

  const activeCount = entries.filter((e) => hasBit(value, e.bit)).length;

  return (
    <div id={id}>
      <div className="flex items-center gap-2">
        <input
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-500"
          onChange={(e) => {
            onChange(Number(e.target.value) || 0);
          }}
          type="number"
          value={value}
        />
        <button
          className="shrink-0 rounded border border-zinc-700 px-2 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          onClick={() => {
            setCollapsed((prev) => !prev);
          }}
          type="button"
        >
          {collapsed
            ? `${String(activeCount)} flag${activeCount === 1 ? "" : "s"}`
            : "Hide"}
        </button>
      </div>

      {collapsed ? null : (
        <div className="mt-2 grid grid-cols-2 gap-1">
          {entries.map((entry) => {
            const isSet = hasBit(value, entry.bit);
            return (
              <label
                className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:bg-zinc-800"
                key={entry.bit}
              >
                <input
                  checked={isSet}
                  className="accent-zinc-400"
                  onChange={() => {
                    onChange(toggleBitValue(value, entry.bit));
                  }}
                  type="checkbox"
                />
                {entry.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function hasBit(value: number, bit: number): boolean {
  const mask = 2 ** bit;
  return Math.floor(value / mask) % 2 === 1;
}

function toggleBitValue(value: number, bit: number): number {
  const mask = 2 ** bit;
  return hasBit(value, bit) ? value - mask : value + mask;
}
