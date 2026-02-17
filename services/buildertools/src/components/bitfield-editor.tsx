import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";

import type { BitfieldEntry } from "@/shared/enums/types.ts";

import { NumberInput } from "./number-input.tsx";

interface BitfieldEditorProps {
  entries: BitfieldEntry[];
  id?: string;
  label?: string;
  onChange: (value: number) => void;
  value: number;
}

export function BitfieldEditor({
  entries,
  id,
  label,
  onChange,
  value,
}: BitfieldEditorProps) {
  const [collapsed, setCollapsed] = useState(true);

  const enabledEntries = entries.filter((e) => !e.disabledReason);
  const activeCount = enabledEntries.filter((e) => hasBit(value, e.bit)).length;

  const handleValueChange = (v: number) => {
    // Clamp negative values -- bitfields are semantically unsigned
    onChange(Math.max(0, v));
  };

  return (
    <Collapsible.Root
      id={id}
      onOpenChange={(open) => {
        setCollapsed(!open);
      }}
      open={!collapsed}
    >
      <div className="flex items-center gap-2">
        <NumberInput
          aria-label={label ? `${label} numeric value` : "Bitfield value"}
          className="focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
          min={0}
          onValueChange={handleValueChange}
          value={value}
        />
        <Collapsible.Trigger asChild>
          <button
            className="focus-visible:ring-accent shrink-0 rounded border border-zinc-700 px-2 py-2 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
            type="button"
          >
            {collapsed
              ? `Show ${activeCount} flag${activeCount === 1 ? "" : "s"}`
              : "Hide flags"}
          </button>
        </Collapsible.Trigger>
      </div>

      <Collapsible.Content className="collapsible-content">
        <div
          aria-label={label ? `${label} flags` : "Flags"}
          className="mt-2 grid grid-cols-2 gap-1 md:grid-cols-3 lg:grid-cols-4"
          role="group"
        >
          {entries.map((entry) => {
            const isSet = hasBit(value, entry.bit);
            const isDisabled = Boolean(entry.disabledReason);
            return (
              <label
                className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs ${
                  isDisabled
                    ? "cursor-not-allowed text-zinc-600"
                    : "cursor-pointer text-zinc-400 hover:bg-zinc-800"
                }`}
                key={entry.bit}
                title={entry.disabledReason}
              >
                <input
                  checked={isSet}
                  className="accent-accent"
                  disabled={isDisabled}
                  onChange={() => {
                    onChange(toggleBitValue(value, entry.bit));
                  }}
                  type="checkbox"
                />
                {entry.label}
              </label>
            );
          })}
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function hasBit(value: number, bit: number): boolean {
  const mask = 2 ** bit;
  return Math.floor(value / mask) % 2 === 1;
}

function toggleBitValue(value: number, bit: number): number {
  const mask = 2 ** bit;
  return hasBit(value, bit) ? value - mask : value + mask;
}
