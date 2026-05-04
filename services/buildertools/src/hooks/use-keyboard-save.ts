import { useEffect } from "react";

export function useKeyboardSave(onSave: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handler({ ctrlKey, key, metaKey, ...e }: KeyboardEvent) {
      if ((ctrlKey || metaKey) && key === "s") {
        e.preventDefault();
        onSave();
      }
    }

    globalThis.addEventListener("keydown", handler);
    return () => {
      globalThis.removeEventListener("keydown", handler);
    };
  }, [onSave, enabled]);
}
