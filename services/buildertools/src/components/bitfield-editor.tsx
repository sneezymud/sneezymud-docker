import type { BitfieldEntry } from "@/shared/enums/types.ts";

import { cn } from "@/lib/cn.ts";

interface BitfieldEditorProps {
  entries: BitfieldEntry[];
  id?: string;
  label?: string;
  onChange: (value: number) => void;
  value: number;
}

export function BitfieldEditor({
  entries,
  id,
  label,
  onChange,
  value,
}: BitfieldEditorProps) {
  return (
    <div
      aria-label={label ? `${label} flags` : "Flags"}
      className="grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4"
      id={id}
      role="group"
    >
      {entries.map((entry) => {
        const isSet = hasBit(value, entry.bit);
        const isDisabled = Boolean(entry.disabledReason);
        return (
          <label
            className={cn(
              "flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs",
              isDisabled
                ? "cursor-not-allowed text-zinc-600"
                : "cursor-pointer text-zinc-400 hover:bg-zinc-800",
            )}
            key={entry.bit}
            title={entry.disabledReason}
          >
            <input
              checked={isSet}
              className="accent-accent"
              disabled={isDisabled}
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
