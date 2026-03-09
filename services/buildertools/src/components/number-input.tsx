import { Input } from "@/components/ui/input.tsx";
import { useNumberDisplay } from "@/hooks/use-number-display.ts";
import { cn } from "@/lib/utils.ts";

interface NumberInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "type" | "value"
> {
  integer?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  step?: number | undefined;
  value: number;
}

export function NumberInput({
  className,
  integer,
  max,
  min,
  onValueChange,
  step = 1,
  value,
  ...rest
}: NumberInputProps) {
  const { display, handleBlur, handleChange, outOfRange } = useNumberDisplay({
    integer,
    max,
    min,
    onValueChange,
    value,
  });

  return (
    <div className="flex flex-col gap-1">
      <Input
        {...rest}
        aria-invalid={outOfRange || undefined}
        className={cn(
          "font-mono",
          className,
          outOfRange && "border-destructive",
        )}
        max={max}
        min={min}
        onBlur={handleBlur}
        onChange={handleChange}
        step={step}
        type="number"
        value={display}
      />

      {outOfRange ? (
        <p className="text-destructive text-xs">
          {min !== undefined && max !== undefined
            ? `Must be between ${min} and ${max}`
            : min === undefined
              ? `Must be at most ${max}`
              : `Must be at least ${min}`}
        </p>
      ) : null}
    </div>
  );
}
