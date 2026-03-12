import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { cn } from "@/lib/utils.ts";

export const richTextDescendants =
  "[&_li]:mb-0.5 [&_p+p]:mt-1.5 [&_strong]:font-semibold [&_ul]:ml-3 [&_ul]:list-disc";

export function FieldHelp({
  children,
  detailedTooltip,
  label,
  open,
}: {
  children: React.ReactNode;
  detailedTooltip?: React.ReactNode;
  label?: string;
  open: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      <div
        className={cn(
          "text-muted-foreground animate-in fade-in slide-in-from-top-1 bg-muted/50 mb-3 rounded-md px-2.5 py-2 text-sm duration-150",
          richTextDescendants,
        )}
      >
        {children}

        {detailedTooltip ? (
          <button
            className="text-primary hover:text-primary/80 mt-1.5 block text-xs underline"
            onClick={() => {
              setSheetOpen(true);
            }}
            type="button"
          >
            Full details
          </button>
        ) : null}
      </div>

      {detailedTooltip ? (
        <Sheet
          onOpenChange={setSheetOpen}
          open={sheetOpen}
        >
          <SheetContent>
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
