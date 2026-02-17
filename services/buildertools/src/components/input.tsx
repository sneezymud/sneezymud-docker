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
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(baseClass, className)}
      {...props}
    />
  );
}
