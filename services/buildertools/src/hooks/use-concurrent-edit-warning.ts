import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Warns the user when server data changes while they have unsaved edits.
 * Compares a stable snapshot of the data at the time edits began against
 * the latest server data.
 */
export function useConcurrentEditWarning(data: unknown, dirty: boolean): void {
  const baseSnapshotRef = useRef<null | string>(null);
  const hasWarnedRef = useRef(false);

  // Capture a snapshot when the user first makes edits
  useEffect(() => {
    if (dirty && baseSnapshotRef.current === null) {
      baseSnapshotRef.current = JSON.stringify(data);
      hasWarnedRef.current = false;
    }
    if (!dirty) {
      baseSnapshotRef.current = null;
      hasWarnedRef.current = false;
    }
  }, [dirty, data]);

  // When data changes while dirty, compare against snapshot
  useEffect(() => {
    if (!dirty || baseSnapshotRef.current === null || hasWarnedRef.current) {
      return;
    }
    const currentData = JSON.stringify(data);
    if (currentData !== baseSnapshotRef.current) {
      hasWarnedRef.current = true;
      toast.warning(
        "This entity was updated by another builder. Your unsaved changes may conflict.",
        { duration: 10_000 },
      );
    }
  }, [data, dirty]);
}
