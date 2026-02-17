import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { useId, useRef, useState } from "react";

import type { EnumEntry } from "@/shared/enums/types.ts";

interface EnumSelectProps {
  entries: EnumEntry[];
  id?: string | undefined;
  onChange: (value: number) => void;
  value: number;
}

const SEARCHABLE_THRESHOLD = 15;

export function EnumSelect({ entries, id, onChange, value }: EnumSelectProps) {
  if (entries.length > SEARCHABLE_THRESHOLD) {
    return (
      <SearchableEnumSelect
        entries={entries}
        id={id}
        onChange={onChange}
        value={value}
      />
    );
  }

  return (
    <NativeEnumSelect
      entries={entries}
      id={id}
      onChange={onChange}
      value={value}
    />
  );
}

function NativeEnumSelect({ entries, id, onChange, value }: EnumSelectProps) {
  const known = entries.some((e) => e.value === value);

  return (
    <Select.Root
      onValueChange={(v) => {
        onChange(Number(v));
      }}
      value={String(value)}
    >
      <Select.Trigger
        className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
        id={id}
      >
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-20 max-h-60 overflow-auto rounded border border-zinc-700 bg-zinc-800 py-1 shadow-lg"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport>
            {known ? null : (
              <Select.Item
                className="data-[highlighted]:bg-accent/20 cursor-pointer px-3 py-1.5 text-sm text-zinc-300 outline-none data-[highlighted]:text-zinc-100"
                value={String(value)}
              >
                <Select.ItemText>Unknown ({String(value)})</Select.ItemText>
              </Select.Item>
            )}
            {entries.map((entry) => (
              <Select.Item
                className="data-[highlighted]:bg-accent/20 cursor-pointer px-3 py-1.5 text-sm text-zinc-300 outline-none data-[highlighted]:text-zinc-100 data-[state=checked]:bg-zinc-700/50 data-[state=checked]:text-zinc-100"
                key={entry.value}
                value={String(entry.value)}
              >
                <Select.ItemText>
                  {entry.label} ({String(entry.value)})
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function SearchableEnumSelect({
  entries,
  id,
  onChange,
  value,
}: EnumSelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listboxId = `${inputId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const current = entries.find((e) => e.value === value);
  const displayText = current
    ? `${current.label} (${String(current.value)})`
    : `Unknown (${String(value)})`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const filtered = search
    ? entries.filter((e) => {
        const term = search.toLowerCase();
        return (
          e.label.toLowerCase().includes(term) || String(e.value).includes(term)
        );
      })
    : entries;

  const scrollToIndex = (index: number) => {
    if (index < 0 || !listRef.current) {
      return;
    }
    const item = listRef.current.children[index];
    if (item instanceof HTMLElement) {
      item.scrollIntoView({ block: "nearest" });
    }
  };

  const select = (entry: EnumEntry) => {
    onChange(entry.value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next =
          highlightIndex < filtered.length - 1 ? highlightIndex + 1 : 0;
        setHighlightIndex(next);
        scrollToIndex(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev =
          highlightIndex > 0 ? highlightIndex - 1 : filtered.length - 1;
        setHighlightIndex(prev);
        scrollToIndex(prev);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const entry = filtered[highlightIndex];
        if (highlightIndex >= 0 && entry) {
          select(entry);
        }
        break;
      }
    }
  };

  return (
    <Popover.Root
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setSearch("");
          setHighlightIndex(-1);
        }
      }}
      open={open}
    >
      <Popover.Trigger asChild>
        <button
          aria-haspopup="listbox"
          className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          id={inputId}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          type="button"
        >
          {displayText}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          className="z-20 w-[var(--radix-popover-trigger-width)] rounded border border-zinc-700 bg-zinc-800 shadow-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          sideOffset={4}
        >
          <input
            aria-activedescendant={
              highlightIndex >= 0
                ? `${listboxId}-${String(highlightIndex)}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded
            className="w-full border-b border-zinc-700 bg-transparent px-3 py-2 text-sm text-zinc-100 outline-none"
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            ref={inputRef}
            role="combobox"
            type="text"
            value={search}
          />
          <ul
            className="max-h-60 overflow-auto py-1"
            id={listboxId}
            ref={listRef}
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400">No matches</li>
            ) : (
              filtered.map((entry, index) => (
                <li
                  aria-selected={entry.value === value}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    index === highlightIndex
                      ? "bg-accent/20 text-zinc-100"
                      : entry.value === value
                        ? "bg-zinc-700/50 text-zinc-100"
                        : "text-zinc-300 hover:bg-zinc-700/30"
                  }`}
                  id={`${listboxId}-${String(index)}`}
                  key={entry.value}
                  onClick={() => {
                    select(entry);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      select(entry);
                    }
                  }}
                  role="option"
                >
                  {entry.label}{" "}
                  <span className="text-zinc-400">({String(entry.value)})</span>
                </li>
              ))
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
