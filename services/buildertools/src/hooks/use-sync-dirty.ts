import { useEffect } from "react";

import { useDirtyStore } from "@/state/dirty.ts";

/** Sync component-level dirty state to the global dirty store (for logout guard). */
export function useSyncDirty(dirty: boolean): void {
  const setDirty = useDirtyStore((s) => s.setDirty);
  useEffect(() => {
    setDirty(dirty);
    return () => {
      setDirty(false);
    };
  }, [dirty, setDirty]);
}
