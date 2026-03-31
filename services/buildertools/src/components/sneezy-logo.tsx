import { cn } from "@/lib/utils.ts";

export function SneezyLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer diamond */}
      <polygon points="16,3 29,16 16,29 3,16" />
      {/* Vertical spine */}

      <line
        x1="16"
        x2="16"
        y1="3"
        y2="29"
      />

      {/* Horizontal crossbar - upper third */}

      <line
        x1="9"
        x2="23"
        y1="11"
        y2="11"
      />

      {/* Horizontal crossbar - lower third */}

      <line
        x1="9"
        x2="23"
        y1="21"
        y2="21"
      />

      {/* Diagonal rune strokes - upper left to lower right */}

      <line
        x1="9"
        x2="14"
        y1="11"
        y2="21"
      />

      {/* Diagonal rune strokes - upper right to lower left */}

      <line
        x1="23"
        x2="18"
        y1="11"
        y2="21"
      />
    </svg>
  );
}
