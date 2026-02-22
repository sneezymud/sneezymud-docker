import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useId, useRef, useState } from "react";
import { z } from "zod";

import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover.tsx";
import { cn } from "@/lib/utils.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { objectKeys } from "@/shared/query-keys.ts";

const objectSearchSchema = z.array(
  z.object({
    short_desc: z.string(),
    vnum: z.number(),
  }),
);

const displayValue = (v: number) => (v <= 0 ? "" : String(v));

interface ObjectPickerProps {
  id?: string | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onChange: (vnum: number) => void;
  value: number;
}

export function ObjectPicker({
  id,
  max,
  min,
  onChange,
  value,
}: ObjectPickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState(() => displayValue(value));
  const [focused, setFocused] = useState(false);

  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (!focused) {
      setInputText(displayValue(value));
    }
  }

  const { data: results } = useQuery({
    enabled: inputText.length >= 2,
    queryFn: () =>
      apiFetch(
        `/api/objects/search?q=${encodeURIComponent(inputText)}`,
        objectSearchSchema,
      ),
    queryKey: objectKeys.search(inputText),
    staleTime: 30_000,
  });

  const items = results ?? [];
  const showDropdown = focused && inputText.length >= 2;

  const commitText = () => {
    if (inputText === "" || inputText === "-") {
      setInputText(displayValue(value));
      return;
    }
    const num = Number.parseInt(inputText, 10);
    if (
      !Number.isNaN(num) &&
      (min === undefined || num >= min) &&
      (max === undefined || num <= max)
    ) {
      onChange(num);
      setInputText(displayValue(num));
    } else {
      setInputText(displayValue(value));
    }
  };

  const selectItem = (vnum: number) => {
    onChange(vnum);
    setInputText(String(vnum));
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <Popover open={showDropdown}>
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
                setInputText(displayValue(value));
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
        {items.length === 0 ? (
          <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
            No objects found
          </p>
        ) : (
          items.map((item) => (
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
              {item.short_desc}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
