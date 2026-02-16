import { useEffect, useId, useRef, useState } from "react";

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
    <select
      className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
      id={id}
      onChange={(e) => {
        onChange(Number(e.target.value));
      }}
      value={value}
    >
      {known ? null : <option value={value}>Unknown ({String(value)})</option>}
      {entries.map((entry) => (
        <option
          key={entry.value}
          value={entry.value}
        >
          {entry.label} ({String(entry.value)})
        </option>
      ))}
    </select>
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
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const openRef = useRef(false);

  const current = entries.find((e) => e.value === value);
  const displayText = current
    ? `${current.label} (${String(current.value)})`
    : `Unknown (${String(value)})`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

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

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
    setHighlightIndex(-1);
    openRef.current = false;
    // Button remounts after state update; schedule focus for next frame
    requestAnimationFrame(() => {
      buttonRef.current?.focus();
    });
  };

  const openDropdown = () => {
    // Measure available space below trigger to decide dropdown direction
    const DROPDOWN_HEIGHT = 260; // max-h-60 (240px) + buffer
    const triggerEl = buttonRef.current ?? containerRef.current;
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      setDropUp(rect.bottom + DROPDOWN_HEIGHT > window.innerHeight);
    }
    setOpen(true);
    openRef.current = true;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  // Persistent outside-click listener — uses openRef to avoid state deps
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        openRef.current &&
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch("");
        setHighlightIndex(-1);
        openRef.current = false;
        requestAnimationFrame(() => {
          buttonRef.current?.focus();
        });
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const select = (entry: EnumEntry) => {
    onChange(entry.value);
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDropdown();
        return;
      }
      return;
    }

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
      case "Escape": {
        e.preventDefault();
        closeDropdown();
        break;
      }
    }
  };

  return (
    <div
      className="relative"
      ref={containerRef}
    >
      {open ? (
        <input
          aria-activedescendant={
            highlightIndex >= 0
              ? `${listboxId}-${String(highlightIndex)}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded
          className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          id={inputId}
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
      ) : (
        <button
          aria-expanded={false}
          aria-haspopup="listbox"
          className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-left text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          id={inputId}
          onClick={() => {
            openDropdown();
          }}
          onKeyDown={handleKeyDown}
          ref={buttonRef}
          type="button"
        >
          {displayText}
        </button>
      )}

      {open ? (
        <ul
          className={`absolute z-20 max-h-60 w-full overflow-auto rounded border border-zinc-700 bg-zinc-800 py-1 shadow-lg ${dropUp ? "bottom-full mb-1" : "mt-1"}`}
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
      ) : null}
    </div>
  );
}
