import { useState } from "react";

import { Input } from "@/components/ui/input.tsx";
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

function useNumberDisplay({
  integer,
  max,
  min,
  onValueChange,
  value,
}: {
  integer?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const [display, setDisplay] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);

  // Sync from parent when value changes externally (data refetch, reset)
  // Uses the render-time comparison pattern instead of useEffect
  if (value !== lastValue) {
    setLastValue(value);
    const parsed = Number(display);
    if (!Number.isFinite(parsed) || parsed !== value) {
      setDisplay(String(value));
    }
  }

  function handleChange({
    target: { value: nextValue },
  }: React.ChangeEvent<HTMLInputElement>) {
    setDisplay(nextValue);
    const parsed = Number(nextValue);

    if (nextValue !== "" && Number.isFinite(parsed)) {
      let clamped = integer ? Math.round(parsed) : parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onValueChange(clamped);
    }
  }

  function handleBlur() {
    const parsed = Number(display);
    if (display === "" || !Number.isFinite(parsed)) {
      setDisplay(String(value));
      return;
    }
    // Snap display to committed value (clamped during change)
    if (parsed !== value) {
      setDisplay(String(value));
    }
  }

  const parsed = Number(display);
  const outOfRange =
    display !== "" &&
    Number.isFinite(parsed) &&
    ((min !== undefined && parsed < min) ||
      (max !== undefined && parsed > max));

  return { display, handleBlur, handleChange, outOfRange };
}
