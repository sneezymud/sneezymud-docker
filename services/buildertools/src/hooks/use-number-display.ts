import { useState } from "react";

interface UseNumberDisplayOptions {
  integer?: boolean | undefined;
  max?: number | undefined;
  min?: number | undefined;
  onValueChange: (value: number) => void;
  value: number;
}

/**
 * Manages the string↔number synchronization for a numeric input.
 * Handles clamping, external value sync, and out-of-range display.
 */
export function useNumberDisplay({
  integer,
  max,
  min,
  onValueChange,
  value,
}: UseNumberDisplayOptions) {
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
      let clamped = integer ? Math.round(parsed) : parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onValueChange(clamped);
    }
  };

  const handleBlur = () => {
    const parsed = Number(display);
    if (display === "" || !Number.isFinite(parsed)) {
      setDisplay(String(value));
      return;
    }
    // Snap display to committed value (clamped during change)
    if (parsed !== value) {
      setDisplay(String(value));
    }
  };

  const parsed = Number(display);
  const outOfRange =
    display !== "" &&
    Number.isFinite(parsed) &&
    ((min !== undefined && parsed < min) ||
      (max !== undefined && parsed > max));

  return { display, handleBlur, handleChange, outOfRange };
}
