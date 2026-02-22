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
import { roomKeys } from "@/shared/query-keys.ts";

const roomSearchSchema = z.array(
  z.object({
    name: z.string(),
    vnum: z.number(),
  }),
);

interface RoomPickerProps {
  id?: string | undefined;
  onChange: (vnum: number) => void;
  value: number;
}

export function RoomPicker({ id, onChange, value }: RoomPickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const inputRef = useRef<HTMLInputElement>(null);

  const [inputText, setInputText] = useState(value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);

  // Sync inputText when value changes externally (e.g., discard/reset)
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (!focused) {
      setInputText(value === 0 ? "" : String(value));
    }
  }

  const { data: results } = useQuery({
    enabled: inputText.length >= 2,
    queryFn: () =>
      apiFetch(
        `/api/rooms/search?q=${encodeURIComponent(inputText)}`,
        roomSearchSchema,
      ),
    queryKey: roomKeys.search(inputText),
    staleTime: 30_000,
  });

  const items = results ?? [];
  const showDropdown = focused && inputText.length >= 2;

  const commitText = () => {
    const num = Number.parseInt(inputText, 10);
    if (!Number.isNaN(num) && num >= 0 && num <= 49_999) {
      onChange(num);
      setInputText(num === 0 ? "" : String(num));
    } else {
      setInputText(value === 0 ? "" : String(value));
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
                setInputText(value === 0 ? "" : String(value));
                setFocused(false);
                inputRef.current?.blur();
              }
            }}
            placeholder="Vnum or search by name..."
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
            No rooms found
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
              {item.name}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
