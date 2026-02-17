import { cn } from "@/lib/cn.ts";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1 block text-sm text-zinc-400", className)}
      {...props}
    />
  );
}
