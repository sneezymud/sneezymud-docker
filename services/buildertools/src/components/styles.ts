// Shared class constants for consistent styling across components

export const INPUT_CLASS =
  "focus-visible:ring-accent w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950";

export const LABEL_CLASS = "mb-1 block text-sm text-zinc-400";

export const BUTTON_PRIMARY_CLASS =
  "bg-accent hover:bg-accent/80 focus-visible:ring-accent rounded px-4 py-2 text-sm text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";

export const BUTTON_SECONDARY_CLASS =
  "focus-visible:ring-accent rounded bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:bg-zinc-600 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 active:scale-[0.98]";

export const BUTTON_DANGER_CLASS =
  "focus-visible:ring-accent rounded border border-red-800/50 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-900/20 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";

export const ERROR_BOX_CLASS =
  "rounded border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400";

// z-index scale for layered UI
export const Z_STICKY_BAR = "z-10";
export const Z_DROPDOWN = "z-20";
export const Z_MOBILE_BACKDROP = "z-30";
export const Z_MOBILE_SIDEBAR = "z-40";
export const Z_MODAL = "z-50";
