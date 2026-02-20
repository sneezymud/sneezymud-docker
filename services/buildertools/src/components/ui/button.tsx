import { type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

import { buttonVariants } from "./variants";

function Button({
  asChild = false,
  className,
  size = "default",
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      className={cn(buttonVariants({ className, size, variant }))}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      type={asChild ? type : (type ?? "button")}
      {...props}
    />
  );
}

export { Button };
