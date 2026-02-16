import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/shared/api-client.ts";

import { NumberInput } from "./number-input.tsx";
import { Z_DROPDOWN } from "./styles.ts";

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
  const listboxId = `${inputId}-results`;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const { data: results } = useQuery({
    enabled: search.length >= 2,
    queryFn: () =>
      apiFetch(
        `/api/rooms/search?q=${encodeURIComponent(search)}`,
        roomSearchSchema,
      ),
    queryKey: ["room-search", search],
    staleTime: 30_000,
  });

  const items = results ?? [];

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
    setHighlightIndex(-1);
    openRef.current = false;
  };

  const openDropdown = () => {
    setOpen(true);
    openRef.current = true;
    requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
  };

  // Persistent outside-click listener
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
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selectRoom = (vnum: number) => {
    onChange(vnum);
    closeDropdown();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      return;
    }
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const next = highlightIndex < items.length - 1 ? highlightIndex + 1 : 0;
        setHighlightIndex(next);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prev = highlightIndex > 0 ? highlightIndex - 1 : items.length - 1;
        setHighlightIndex(prev);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const item = items[highlightIndex];
        if (highlightIndex >= 0 && item) {
          selectRoom(item.vnum);
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
      <div className="flex items-center gap-1">
        <NumberInput
          className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          id={inputId}
          onValueChange={onChange}
          value={value}
        />
        <button
          aria-label="Search rooms"
          className="shrink-0 rounded border border-zinc-700 px-1.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          onClick={() => {
            if (open) {
              closeDropdown();
            } else {
              openDropdown();
            }
          }}
          type="button"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>
      </div>

      {open ? (
        <div
          className={`absolute ${Z_DROPDOWN} mt-1 w-64 rounded border border-zinc-700 bg-zinc-800 p-2 shadow-lg`}
        >
          <input
            aria-controls={listboxId}
            className="focus-visible:ring-accent mb-2 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus-visible:ring-2"
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or vnum..."
            ref={searchRef}
            type="text"
            value={search}
          />
          {search.length >= 2 ? (
            <ul
              className="max-h-40 overflow-auto"
              id={listboxId}
              role="listbox"
            >
              {items.length === 0 ? (
                <li className="px-2 py-1.5 text-xs text-zinc-400">
                  No rooms found
                </li>
              ) : (
                items.map((item, index) => (
                  <li
                    aria-selected={item.vnum === value}
                    className={`cursor-pointer rounded px-2 py-1 text-xs ${
                      index === highlightIndex
                        ? "bg-accent/20 text-zinc-100"
                        : "text-zinc-300 hover:bg-zinc-700/30"
                    }`}
                    key={item.vnum}
                    onClick={() => {
                      selectRoom(item.vnum);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectRoom(item.vnum);
                      }
                    }}
                    role="option"
                  >
                    <span className="font-mono text-zinc-400">{item.vnum}</span>{" "}
                    {item.name}
                  </li>
                ))
              )}
            </ul>
          ) : (
            <p className="px-2 py-1.5 text-xs text-zinc-400">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
