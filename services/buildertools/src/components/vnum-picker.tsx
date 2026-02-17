import * as Popover from "@radix-ui/react-popover";
import { useRef, useState } from "react";

interface VnumPickerProps {
  createPending?: boolean | undefined;
  existingVnums: Set<number>;
  onCreate: (vnum: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  triggerLabel: string;
  vnumBlocks: Array<{ end: number; start: number }>;
}

export function VnumPicker({
  createPending,
  existingVnums,
  onCreate,
  onOpenChange,
  open,
  triggerLabel,
  vnumBlocks,
}: VnumPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Find next available vnum
  let suggestedVnum: null | number = null;
  for (const block of vnumBlocks) {
    for (let v = block.start; v <= block.end; v++) {
      if (!existingVnums.has(v)) {
        suggestedVnum = v;
        break;
      }
    }
    if (suggestedVnum !== null) {
      break;
    }
  }

  const [vnumInput, setVnumInput] = useState(
    suggestedVnum === null ? "" : String(suggestedVnum),
  );

  const vnumNumber = Number(vnumInput);
  const isValid =
    vnumInput !== "" &&
    Number.isInteger(vnumNumber) &&
    vnumBlocks.some((b) => vnumNumber >= b.start && vnumNumber <= b.end) &&
    !existingVnums.has(vnumNumber);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isValid) {
      onCreate(vnumNumber);
      onOpenChange(false);
    }
  };

  return (
    <Popover.Root
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setVnumInput(suggestedVnum === null ? "" : String(suggestedVnum));
        }
        onOpenChange(isOpen);
      }}
      open={open}
    >
      <Popover.Trigger asChild>
        <button
          className="focus-visible:ring-accent rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 active:scale-[0.98]"
          type="button"
        >
          {triggerLabel}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-20 w-80 rounded border border-zinc-700 bg-zinc-800 p-4 shadow-lg"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          sideOffset={4}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-200">
              Create at vnum
            </h3>
            <Popover.Close className="focus-visible:ring-accent text-xs text-zinc-400 hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950">
              Cancel
            </Popover.Close>
          </div>

          <form
            className="flex items-end gap-3"
            onSubmit={handleSubmit}
          >
            <div className="flex-1">
              <input
                className="focus-visible:ring-accent w-full rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950"
                onChange={(e) => {
                  setVnumInput(e.target.value);
                }}
                placeholder={
                  suggestedVnum === null
                    ? "Enter vnum"
                    : `Next available: ${suggestedVnum}`
                }
                ref={inputRef}
                type="number"
                value={vnumInput}
              />
              <p className="mt-1 text-xs text-zinc-400">
                Ranges:{" "}
                {vnumBlocks.map((b) => `${b.start}-${b.end}`).join(", ")}
              </p>
            </div>
            <button
              className="focus-visible:ring-accent rounded bg-zinc-600 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-500 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:opacity-50"
              disabled={!isValid || createPending}
              type="submit"
            >
              {createPending ? "Creating..." : "Create"}
            </button>
          </form>

          {vnumInput !== "" && !isValid ? (
            <p className="mt-2 text-xs text-red-400">
              {existingVnums.has(vnumNumber)
                ? "Already exists"
                : "Outside your assigned blocks"}
            </p>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
