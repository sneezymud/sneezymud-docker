import { Info } from "lucide-react";
import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { cn } from "@/lib/utils.ts";

export const richTextDescendants =
  "[&_li]:mb-0.5 [&_p+p]:mt-1.5 [&_strong]:font-semibold [&_ul]:ml-3 [&_ul]:list-disc";

export function FieldTooltip({
  children,
  detailedTooltip,
  label,
}: {
  children: React.ReactNode;
  detailedTooltip?: React.ReactNode;
  label?: string;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn(
              "text-muted-foreground hover:text-foreground ml-1 inline-flex",
              detailedTooltip ? "cursor-pointer" : "cursor-help",
            )}
            onClick={
              detailedTooltip
                ? () => {
                    setSheetOpen(true);
                  }
                : undefined
            }
            type="button"
          >
            <Info
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
          </button>
        </TooltipTrigger>

        <TooltipContent
          className={cn("max-w-sm text-sm text-wrap", richTextDescendants)}
          sideOffset={5}
        >
          {children}

          {detailedTooltip ? (
            <button
              className="text-muted-foreground hover:text-foreground mt-2 block text-xs italic underline"
              onClick={() => {
                setSheetOpen(true);
              }}
              type="button"
            >
              Click for full details
            </button>
          ) : null}
        </TooltipContent>
      </Tooltip>

      {detailedTooltip ? (
        <Sheet
          onOpenChange={setSheetOpen}
          open={sheetOpen}
        >
          <SheetContent className="sm:max-w-lg lg:max-w-xl xl:max-w-2xl">
            <SheetHeader>
              <SheetTitle>{label ?? "Details"}</SheetTitle>
              <SheetDescription>Detailed field reference</SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 overflow-hidden">
              <div className={cn("px-4 pb-4 text-sm", richTextDescendants)}>
                {detailedTooltip}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
