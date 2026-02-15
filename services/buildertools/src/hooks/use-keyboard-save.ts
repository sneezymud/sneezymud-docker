import { useEffect } from "react";

export function useKeyboardSave(onSave: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };

    globalThis.addEventListener("keydown", handler);
    return () => {
      globalThis.removeEventListener("keydown", handler);
    };
  }, [onSave, enabled]);
}
