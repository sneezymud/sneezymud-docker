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
  disabled?: boolean | undefined;
  entries: BitfieldEntry[];
  id?: string;
  label?: string;
  onChange: (value: number) => void;
  value: number;
}

export function BitfieldEditor({
  className,
  disabled,
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
      className={cn(
        "rounded-md border border-transparent p-1",
        disabled && "opacity-60",
        className,
      )}
      id={id}
      role="group"
    >
      <div className="mb-1 flex flex-wrap items-center gap-1 pl-1.5">
        {setEntries.length === 0 ? (
          <span className="text-muted-foreground text-sm">None set</span>
        ) : (
          setEntries.map(({ bit, label: entryLabel }) => (
            <span
              className="bg-secondary text-foreground rounded px-1.5 py-0.5 text-xs"
              key={bit}
            >
              {entryLabel}
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
          {activeEntries.map(({ bit, label: entryLabel, tooltip }) => {
            const isSet = hasBit(value, bit);
            return (
              <div
                className="flex items-center gap-0.5"
                key={bit}
              >
                <div
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm",
                    disabled && "cursor-default",
                    isSet
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground/80 hover:bg-muted",
                  )}
                >
                  <Checkbox
                    checked={isSet}
                    className="size-5"
                    disabled={disabled}
                    id={`${id}-${bit}`}
                    onCheckedChange={() => {
                      onChange(toggleBit(value, bit));
                    }}
                  />

                  <label htmlFor={`${id}-${bit}`}>{entryLabel}</label>
                </div>

                {tooltip !== undefined && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label={`Info about ${entryLabel}`}
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
                      <p>{tooltip}</p>
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
