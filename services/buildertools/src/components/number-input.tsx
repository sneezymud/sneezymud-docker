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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);

    const parsed = Number(raw);
    if (raw !== "" && Number.isFinite(parsed)) {
      onValueChange(integer ? Math.round(parsed) : parsed);
    }
  };

  const handleBlur = () => {
    const parsed = Number(display);
    if (display === "" || !Number.isFinite(parsed)) {
      setDisplay(String(value));
    }
  };

  const parsed = Number(display);
  const outOfRange =
    display !== "" &&
    Number.isFinite(parsed) &&
    ((min !== undefined && parsed < min) ||
      (max !== undefined && parsed > max));

  return (
    <div>
      <Input
        {...rest}
        aria-invalid={outOfRange || undefined}
        className={cn(className, outOfRange && "border-destructive")}
        max={max}
        min={min}
        onBlur={handleBlur}
        onChange={handleChange}
        step={step}
        type="number"
        value={display}
      />
      {outOfRange ? (
        <p className="text-destructive mt-1 text-xs">
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
