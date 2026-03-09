import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";

export interface EntityPickerItem {
  label: string;
  vnum: number;
}

interface EntityPickerProps {
  /** Given user's raw text input, return the value + display string to commit, or null to reject and reset. */
  commitValue: (text: string) => null | { display: string; value: number };
  /** Format a numeric value for display in the input. */
  formatValue: (v: number) => string;
  id?: string | undefined;
  noResultsMessage: string;
  onChange: (vnum: number) => void;
  queryKeyFn: (text: string) => readonly unknown[];
  searchFn: (text: string) => Promise<EntityPickerItem[]>;
  value: number;
}

export function EntityPicker({
  commitValue,
  formatValue,
  id,
  noResultsMessage,
  onChange,
  queryKeyFn,
  searchFn,
  value,
}: EntityPickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState(() => formatValue(value));
  const [focused, setFocused] = useState(false);

  // Sync from parent when value changes externally (e.g. reset, save round-trip).
  // Render-time comparison pattern - intentional, not a bug.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (!focused) {
      setInputText(formatValue(value));
    }
  }

  const { data: results } = useQuery({
    enabled: inputText.length >= 2,
    queryFn: () => searchFn(inputText),
    queryKey: queryKeyFn(inputText),
    staleTime: 30_000,
  });

  const commitText = () => {
    const result = commitValue(inputText);
    if (result) {
      onChange(result.value);
      setInputText(result.display);
    } else {
      setInputText(formatValue(value));
    }
  };

  const selectItem = (vnum: number) => {
    onChange(vnum);
    setInputText(String(vnum));
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <Popover open={focused && inputText.length >= 2}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            className="px-2 py-1 pr-7"
            id={inputId}
            onBlur={() => {
              setFocused(false);
              commitText();
            }}
            onChange={(e) => {
              setInputText(e.target.value);
            }}
            onFocus={() => {
              setFocused(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commitText();
                setFocused(false);
                inputRef.current?.blur();
              }
              if (e.key === "Escape") {
                setInputText(formatValue(value));
                setFocused(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="Enter vnum or search by name..."
            ref={inputRef}
            value={inputText}
          />

          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2" />
        </div>
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="max-h-48 w-64 overflow-y-auto p-1"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {(results ?? []).length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
            {noResultsMessage}
          </p>
        ) : (
          (results ?? []).map((item) => (
            <button
              className={cn(
                "hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs",
                "focus-visible:bg-accent outline-none",
              )}
              key={item.vnum}
              onClick={() => {
                selectItem(item.vnum);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              type="button"
            >
              <span className="text-muted-foreground font-mono">
                {item.vnum}
              </span>

              {item.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
