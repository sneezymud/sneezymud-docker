import type { BitfieldEntry } from "@/shared/enums/types.ts";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import { cn } from "@/lib/utils.ts";

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
                ? "text-muted-foreground/60 cursor-not-allowed"
                : "text-muted-foreground hover:bg-muted cursor-pointer",
            )}
            key={entry.bit}
            title={entry.disabledReason}
          >
            <Checkbox
              checked={isSet}
              disabled={isDisabled}
              onCheckedChange={() => {
                onChange(toggleBitValue(value, entry.bit));
              }}
            />
            <span className="truncate">{entry.label}</span>
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
