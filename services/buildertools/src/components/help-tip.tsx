import { Info } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";

export function HelpTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="text-muted-foreground hover:text-foreground inline-flex cursor-help"
            type="button"
          >
            <Info
              aria-hidden="true"
              className="h-3.5 w-3.5"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs text-sm text-wrap"
          sideOffset={5}
        >
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
