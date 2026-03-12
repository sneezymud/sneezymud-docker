import { Info } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";

export function HelpTip({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground inline-flex cursor-help"
          type="button"
        >
          <Info
            aria-hidden="true"
            className="h-3.5 w-3.5"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="max-w-xs text-sm"
        sideOffset={5}
      >
        <p>{text}</p>
      </PopoverContent>
    </Popover>
  );
}
