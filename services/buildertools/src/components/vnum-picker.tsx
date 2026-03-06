import { useRef, useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";

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
  const inBlocks =
    vnumBlocks.length === 0 ||
    vnumBlocks.some((b) => vnumNumber >= b.start && vnumNumber <= b.end);
  const isValid =
    vnumInput !== "" &&
    Number.isInteger(vnumNumber) &&
    vnumNumber >= 0 &&
    inBlocks &&
    !existingVnums.has(vnumNumber);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isValid) {
      onCreate(vnumNumber);
      onOpenChange(false);
    }
  };

  return (
    <Popover
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setVnumInput(suggestedVnum === null ? "" : String(suggestedVnum));
        }
        onOpenChange(isOpen);
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">Create at vnum</h3>

          <PopoverClose className="text-muted-foreground hover:text-foreground text-xs">
            Cancel
          </PopoverClose>
        </div>

        <form
          className="flex items-end gap-3"
          onSubmit={handleSubmit}
        >
          <div className="flex-1">
            <Input
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

            {vnumBlocks.length > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                Ranges:{" "}
                {vnumBlocks.map((b) => `${b.start}-${b.end}`).join(", ")}
              </p>
            )}
          </div>

          <Button
            disabled={!isValid || createPending}
            type="submit"
            variant="secondary"
          >
            {createPending ? "Creating..." : "Create"}
          </Button>
        </form>

        {vnumInput !== "" && !isValid ? (
          <p className="text-destructive mt-2 text-xs">
            {existingVnums.has(vnumNumber)
              ? "Already exists"
              : !Number.isInteger(vnumNumber) || vnumNumber < 0
                ? "Must be a non-negative whole number"
                : "Outside your assigned blocks"}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
