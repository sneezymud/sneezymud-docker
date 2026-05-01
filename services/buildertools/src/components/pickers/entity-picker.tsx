import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
import { objectKeys, roomKeys } from "@/shared/query-keys.ts";

type EntityType = "object" | "room";

export function EntityPicker({
  className,
  disabled,
  id,
  max,
  min,
  onChange,
  type,
  value,
}: {
  className?: string | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onChange: (vnum: number) => void;
  type: EntityType;
  value: number;
}) {
  const {
    focused,
    inputRef,
    inputText,
    items,
    onBlur,
    onCommit,
    onFocus,
    onInputChange,
    onReset,
    selectItem,
  } = useEntityPicker({ max, min, onChange, type, value });

  return (
    <>
      <Popover open={focused && inputText.length >= 2 && !disabled}>
        <PickerInput
          className={className}
          disabled={disabled}
          id={id}
          inputRef={inputRef}
          inputText={inputText}
          onBlur={onBlur}
          onCommit={onCommit}
          onFocus={onFocus}
          onInputChange={onInputChange}
          onReset={onReset}
        />

        <PickerResults
          items={items}
          selectItem={selectItem}
          type={type}
        />
      </Popover>

      <EntityPreview
        type={type}
        value={value}
      />
    </>
  );
}

function formatValue(v: number) {
  return v === 0 ? "" : String(v);
}

function useEntityPicker({
  max,
  min,
  onChange,
  type,
  value,
}: {
  max?: number | undefined;
  min?: number | undefined;
  onChange: (vnum: number) => void;
  type: EntityType;
  value: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dismissingRef = useRef(false);
  const config = entityConfigs[type];
  const resolvedMax = max ?? config.max;
  const resolvedMin = min ?? config.min;

  const displayText = formatValue(value);
  const [inputText, setInputText] = useState(displayText);
  const [focused, setFocused] = useState(false);

  // Sync from parent when value changes externally (e.g. reset, save round-trip).
  // Render-time comparison pattern - intentional, not a bug.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setInputText(displayText);
  }

  function commitText() {
    const trimmed = inputText.trim();

    if (trimmed === "" || trimmed === "-") {
      if (config.allowEmpty) {
        onChange(0);
        setInputText("");
      } else {
        setInputText(formatValue(value));
      }

      return;
    }

    const num = Number.parseInt(trimmed, 10);

    if (
      Number.isNaN(num) ||
      (resolvedMin !== undefined && num < resolvedMin) ||
      (resolvedMax !== undefined && num > resolvedMax)
    ) {
      setInputText(formatValue(value));
      return;
    }

    onChange(num);
    setInputText(formatValue(num));
  }

  function dismiss() {
    dismissingRef.current = true;
    setFocused(false);
    inputRef.current?.blur();
    dismissingRef.current = false;
  }

  const { data: results } = useQuery({
    enabled: inputText.length >= 2,
    queryFn: () => config.searchFn(inputText),
    queryKey: config.searchKeyFn(inputText),
    staleTime: 30_000,
  });

  return {
    focused,
    inputRef,
    inputText,
    items: results ?? EMPTY_ITEMS,
    onBlur: () => {
      if (dismissingRef.current) return;
      setFocused(false);
      commitText();
    },
    onCommit: () => {
      commitText();
      dismiss();
    },
    onFocus: () => {
      setFocused(true);
    },
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value);
    },
    onReset: () => {
      setInputText(formatValue(value));
      dismiss();
    },
    selectItem: (vnum: number) => {
      onChange(vnum);
      setInputText(String(vnum));
      dismiss();
    },
  };
}

function PickerInput({
  className,
  disabled,
  id,
  inputRef,
  inputText,
  onBlur,
  onCommit,
  onFocus,
  onInputChange,
  onReset,
}: {
  className?: string | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputText: string;
  onBlur: () => void;
  onCommit: () => void;
  onFocus: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <PopoverAnchor asChild>
      <div className="relative">
        <Input
          className={cn("px-2 py-1 pr-7", className)}
          disabled={disabled}
          id={inputId}
          onBlur={onBlur}
          onChange={onInputChange}
          onFocus={onFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit();
            if (e.key === "Escape") onReset();
          }}
          placeholder="Enter vnum or search by name..."
          ref={inputRef}
          value={inputText}
        />

        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2" />
      </div>
    </PopoverAnchor>
  );
}

function PickerResults({
  items,
  selectItem,
  type,
}: {
  items: Array<{ label: string; vnum: number }>;
  selectItem: (vnum: number) => void;
  type: EntityType;
}) {
  return (
    <PopoverContent
      align="start"
      className="max-h-48 w-64 overflow-y-auto p-1"
      onOpenAutoFocus={(e) => {
        e.preventDefault();
      }}
    >
      {items.length === 0 ? (
        <p className="text-muted-foreground px-2 py-1.5 text-center text-xs">
          No {type}s found
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
            <span className="text-muted-foreground font-mono">{item.vnum}</span>
            {item.label}
          </button>
        ))
      )}
    </PopoverContent>
  );
}

function EntityPreview({ type, value }: { type: EntityType; value: number }) {
  const config = entityConfigs[type];

  const { data } = useQuery({
    enabled: value > 0,
    queryFn: () => config.nameFn(value),
    queryKey: config.nameKeyFn(value),
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.name) return null;

  return (
    <Link
      className="text-muted-foreground hover:text-foreground mt-0.5 block truncate text-xs"
      params={{ vnum: String(value) }}
      to={config.route}
    >
      {data.name}
    </Link>
  );
}

const nameSchema = z.object({
  name: z.string().nullable(),
  vnum: z.number(),
});

const perTypeData = {
  object: {
    allowEmpty: false,
    keys: objectKeys,
    max: undefined,
    min: undefined,
    searchSchema: z
      .array(z.object({ short_desc: z.string(), vnum: z.number() }))
      .transform((arr) =>
        arr.map(({ short_desc, vnum }) => ({ label: short_desc, vnum })),
      ),
  },
  room: {
    allowEmpty: true,
    keys: roomKeys,
    max: 49_999,
    min: 0,
    searchSchema: z
      .array(z.object({ name: z.string(), vnum: z.number() }))
      .transform((arr) => arr.map(({ name, vnum }) => ({ label: name, vnum }))),
  },
} as const;

function createEntityConfig(type: EntityType) {
  const { keys, searchSchema, ...rest } = perTypeData[type];
  return {
    ...rest,
    nameFn: (vnum: number) =>
      apiFetch(`/api/${type}s/name/${vnum}`, nameSchema),
    nameKeyFn: keys.name,
    route: `/${type}s/$vnum` as const,
    searchFn: (text: string) =>
      apiFetch(
        `/api/${type}s/search?q=${encodeURIComponent(text)}`,
        searchSchema,
      ),
    searchKeyFn: keys.search,
  };
}

const entityConfigs = {
  object: createEntityConfig("object"),
  room: createEntityConfig("room"),
} as const;

const EMPTY_ITEMS: Array<{ label: string; vnum: number }> = [];
