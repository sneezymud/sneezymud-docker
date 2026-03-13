import { useState } from "react";

import { cn } from "@/lib/utils.ts";

import { FieldHelp } from "./info-tooltip.tsx";

export function SectionHeader({
  action,
  detailedTooltip,
  title,
  tooltip,
}: {
  action?: React.ReactNode;
  detailedTooltip?: React.ReactNode;
  title: string;
  tooltip?: React.ReactNode;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const hasHelp = !!(tooltip ?? detailedTooltip);

  return (
    <>
      <legend className="sr-only">{title}</legend>

      <div className="text-accent/70 border-border/40 mb-3 flex items-center gap-2 border-b pb-1.5 text-xs font-medium tracking-wider uppercase">
        {hasHelp ? (
          <button
            className={cn(
              "decoration-muted-foreground/50 cursor-help uppercase underline decoration-dotted underline-offset-4",
              helpOpen && "decoration-current",
            )}
            onClick={() => {
              setHelpOpen((o) => !o);
            }}
            type="button"
          >
            {title}
          </button>
        ) : (
          <span>{title}</span>
        )}

        {action}
      </div>

      {hasHelp ? (
        <FieldHelp
          detailedTooltip={detailedTooltip}
          label={title}
          open={helpOpen}
        >
          {tooltip}
        </FieldHelp>
      ) : null}
    </>
  );
}
