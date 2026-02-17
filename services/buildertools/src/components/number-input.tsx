import { useState } from "react";

import { cn } from "@/lib/cn.ts";

const baseClass =
  "w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950";

interface NumberInputProps extends Omit<
  React.ComponentProps<"input">,
  "onChange" | "type" | "value"
> {
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  step?: number | undefined;
  value: number;
}

export function NumberInput({
  className,
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
      onValueChange(parsed);
    }
  };

  const handleBlur = () => {
    // On blur, snap display back to the parent value if the input is empty or invalid
    const parsed = Number(display);
    if (display === "" || !Number.isFinite(parsed)) {
      setDisplay(String(value));
    }
  };

  return (
    <input
      {...rest}
      className={cn(baseClass, className)}
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
