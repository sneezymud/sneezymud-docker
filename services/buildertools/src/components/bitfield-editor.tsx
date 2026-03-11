import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";

import type { BitfieldEntry } from "@/shared/types/enums.ts";

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useIsMobile } from "@/hooks/use-is-mobile.ts";
import { cn } from "@/lib/utils.ts";
import { hasBit, toggleBit } from "@/shared/bitfield.ts";

interface BitfieldEditorProps {
  className?: string | undefined;
  entries: BitfieldEntry[];
  id?: string;
  label?: string;
  onChange: (value: number) => void;
  value: number;
}

export function BitfieldEditor({
  className,
  entries,
  id,
  label,
  onChange,
  value,
}: BitfieldEditorProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(isMobile);

  const activeEntries = entries.filter((e) => !e.disabledReason);
  const setEntries = activeEntries.filter((e) => hasBit(value, e.bit));

  if (collapsed) {
    return (
      <div
        aria-label={label ? `${label} flags` : "Flags"}
        id={id}
        role="group"
      >
        <Button
          className="text-muted-foreground h-auto gap-1.5 px-0 py-1 text-sm"
          onClick={() => {
            setCollapsed(false);
          }}
          variant="ghost"
        >
          <ChevronDown className="size-4" />

          {setEntries.length === 0
            ? "None set"
            : `${setEntries.length} set: ${setEntries.map((e) => e.label).join(", ")}`}
        </Button>
      </div>
    );
  }

  return (
    <div
      aria-label={label ? `${label} flags` : "Flags"}
      id={id}
      role="group"
    >
      <div
        className={cn(
          "grid grid-cols-[repeat(auto-fill,11rem)] gap-x-3 gap-y-1 rounded-md border border-transparent p-1",
          className,
        )}
      >
        {activeEntries.map((entry) => {
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

      <Button
        className="text-muted-foreground mt-1 h-auto gap-1.5 px-0 py-1 text-xs"
        onClick={() => {
          setCollapsed(true);
        }}
        variant="ghost"
      >
        <ChevronDown className="size-3.5 rotate-180" />
        Collapse
      </Button>
    </div>
  );
}
