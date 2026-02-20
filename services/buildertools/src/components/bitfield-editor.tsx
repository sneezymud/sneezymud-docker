import { Info } from "lucide-react";

import type { BitfieldEntry } from "@/shared/enums/types.ts";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

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
      className="grid grid-cols-[repeat(auto-fill,11rem)] gap-x-3 gap-y-1"
      id={id}
      role="group"
    >
      {entries
        .filter((e) => !e.disabledReason)
        .map((entry) => {
          const isSet = hasBit(value, entry.bit);
          return (
            <div
              className="flex items-center gap-0.5"
              key={entry.bit}
            >
              <label className="text-foreground/80 hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm">
                <Checkbox
                  checked={isSet}
                  className="size-5"
                  onCheckedChange={() => {
                    onChange(toggleBitValue(value, entry.bit));
                  }}
                />
                <span>{entry.label}</span>
              </label>
              {entry.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="text-muted-foreground hover:text-foreground inline-flex cursor-help"
                      type="button"
                    >
                      <Info
                        aria-hidden="true"
                        className="h-3 w-3"
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    className="max-w-xs text-sm text-wrap"
                    sideOffset={5}
                  >
                    <p>{entry.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
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
