import { ChevronRight, Info } from "lucide-react";
import { useState } from "react";

import type { BitfieldEntry } from "@/shared/types/enums.ts";

import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
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

  return (
    <div
      aria-label={label ? `${label} flags` : "Flags"}
      className={cn("rounded-md border border-transparent p-1", className)}
      id={id}
      role="group"
    >
      <div className="mb-1 flex flex-wrap items-center gap-1 pl-1.5">
        {setEntries.length === 0 ? (
          <span className="text-muted-foreground text-sm">None set</span>
        ) : (
          setEntries.map((e) => (
            <span
              className="bg-secondary text-foreground rounded px-1.5 py-0.5 text-xs"
              key={e.bit}
            >
              {e.label}
            </span>
          ))
        )}

        <Button
          className="text-muted-foreground size-6 shrink-0"
          onClick={() => {
            setCollapsed((c) => !c);
          }}
          size="icon"
          variant="ghost"
        >
          <ChevronRight className={cn("size-4", !collapsed && "rotate-90")} />
        </Button>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-2">
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

                {entry.tooltip !== undefined && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label={`Info about ${entry.label}`}
                        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex cursor-help rounded-sm outline-none focus-visible:ring-[3px]"
                        type="button"
                      >
                        <Info
                          aria-hidden="true"
                          className="h-3 w-3"
                        />
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      className="max-w-xs text-sm"
                      sideOffset={5}
                    >
                      <p>{entry.tooltip}</p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
