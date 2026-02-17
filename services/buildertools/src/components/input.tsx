import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/cn.ts";

const baseClass =
  "w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(baseClass, className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  rows = 1,
  ...props
}: React.ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  });

  return (
    <textarea
      {...props}
      className={cn(baseClass, "resize-none overflow-hidden", className)}
      ref={ref}
      rows={rows}
    />
  );
}
