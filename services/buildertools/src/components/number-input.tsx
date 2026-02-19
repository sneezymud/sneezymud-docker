import { useState } from "react";

import { Input } from "@/components/ui/input.tsx";

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

  const clamp = (n: number): number => {
    let result = n;
    if (integer) result = Math.round(result);
    if (min !== undefined && result < min) result = min;
    if (max !== undefined && result > max) result = max;
    return result;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);

    const parsed = Number(raw);
    if (raw !== "" && Number.isFinite(parsed)) {
      onValueChange(clamp(parsed));
    }
  };

  const handleBlur = () => {
    const parsed = Number(display);
    if (display === "" || !Number.isFinite(parsed)) {
      setDisplay(String(value));
      return;
    }
    const clamped = clamp(parsed);
    if (clamped !== parsed) {
      setDisplay(String(clamped));
      onValueChange(clamped);
    }
  };

  return (
    <Input
      {...rest}
      className={className}
      max={max}
      min={min}
      onBlur={handleBlur}
      onChange={handleChange}
      step={step}
      type="number"
      value={display}
    />
  );
}
