import { Info } from "lucide-react";

import type { BitfieldEntry } from "@/shared/types/enums.ts";

import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";
import { hasBit, toggleBit } from "@/shared/bitfield.ts";

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
              <div
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm",
                  isSet
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/80 hover:bg-muted",
                )}
              >
                <Checkbox
                  checked={isSet}
                  className="size-5"
                  id={`${id}-${entry.bit}`}
                  onCheckedChange={() => {
                    onChange(toggleBit(value, entry.bit));
                  }}
                />

                <label htmlFor={`${id}-${entry.bit}`}>{entry.label}</label>
              </div>

              {entry.tooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      aria-label={`Info about ${entry.label}`}
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
