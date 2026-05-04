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
  allowAnyVnum?: boolean | undefined;
  createPending?: boolean | undefined;
  existingVnums: Set<number>;
  onCreate: (vnum: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  triggerLabel: string;
  vnumBlocks: Array<{ end: number; start: number }>;
}

export function VnumPicker({
  allowAnyVnum,
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
  for (const { end, start } of vnumBlocks) {
    for (let v = start; v <= end; v++) {
      if (!existingVnums.has(v)) {
        suggestedVnum = v;
        break;
      }
    }
    if (suggestedVnum !== null) {
      break;
    }
  }

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
          onOpenChange={onOpenChange}
          open={open}
        >
          <SheetContent
            className="px-4 pt-4 pb-6"
            showCloseButton={false}
            side="bottom"
          >
            <SheetTitle className="sr-only">Create at vnum</SheetTitle>

            <VnumPickerForm
              allowAnyVnum={allowAnyVnum}
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
      onOpenChange={onOpenChange}
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
          allowAnyVnum={allowAnyVnum}
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
  allowAnyVnum,
  createPending,
  existingVnums,
  onCreate,
  onOpenChange,
  suggestedVnum,
  vnumBlocks,
}: {
  allowAnyVnum?: boolean | undefined;
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
    allowAnyVnum === true ||
    vnumBlocks.length === 0 ||
    vnumBlocks.some(
      ({ end, start }) => vnumNumber >= start && vnumNumber <= end,
    );
  const isValid =
    vnumInput !== "" &&
    Number.isInteger(vnumNumber) &&
    vnumNumber >= 0 &&
    inBlocks &&
    !existingVnums.has(vnumNumber);

  return (
    <>
      <form
        className="flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (isValid) {
            onCreate(vnumNumber);
            onOpenChange(false);
          }
        }}
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

          {!allowAnyVnum && vnumBlocks.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">
              Ranges:{" "}
              {vnumBlocks.map(({ end, start }) => `${start}-${end}`).join(", ")}
            </p>
          )}
        </div>

        <Button
          disabled={!isValid || createPending}
          size="inline"
          type="submit"
          variant="inline"
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
