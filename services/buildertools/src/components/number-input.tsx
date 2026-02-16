import { useState } from "react";

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
