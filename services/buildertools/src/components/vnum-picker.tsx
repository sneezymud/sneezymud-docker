import { useRef, useState } from "react";

import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet.tsx";
import { useIsMobile } from "@/hooks/use-is-mobile.ts";

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
  const isMobile = useIsMobile();

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

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  if (isMobile) {
    return (
      <>
        <Button
          onClick={() => {
            onOpenChange(true);
          }}
          size="sm"
        >
          {triggerLabel}
        </Button>

        <Sheet
          onOpenChange={handleOpenChange}
          open={open}
        >
          <SheetContent
            className="px-4 pt-4 pb-6"
            showCloseButton={false}
            side="bottom"
          >
            <SheetTitle className="sr-only">Create at vnum</SheetTitle>

            <VnumPickerForm
              createPending={createPending}
              existingVnums={existingVnums}
              onCreate={onCreate}
              onOpenChange={onOpenChange}
              suggestedVnum={suggestedVnum}
              vnumBlocks={vnumBlocks}
            />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover
      onOpenChange={handleOpenChange}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80"
      >
        <VnumPickerForm
          createPending={createPending}
          existingVnums={existingVnums}
          onCreate={onCreate}
          onOpenChange={onOpenChange}
          suggestedVnum={suggestedVnum}
          vnumBlocks={vnumBlocks}
        />
      </PopoverContent>
    </Popover>
  );
}

function VnumPickerForm({
  createPending,
  existingVnums,
  onCreate,
  onOpenChange,
  suggestedVnum,
  vnumBlocks,
}: {
  createPending?: boolean | undefined;
  existingVnums: Set<number>;
  onCreate: (vnum: number) => void;
  onOpenChange: (open: boolean) => void;
  suggestedVnum: null | number;
  vnumBlocks: Array<{ end: number; start: number }>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

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
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">Create at vnum</h3>

        <button
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={() => {
            onOpenChange(false);
          }}
          type="button"
        >
          Cancel
        </button>
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
              Ranges: {vnumBlocks.map((b) => `${b.start}-${b.end}`).join(", ")}
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
    </>
  );
}
