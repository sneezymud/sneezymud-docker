import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Warns the user when server data changes while they have unsaved edits.
 * Captures a snapshot of the data when editing begins, then compares
 * against subsequent server data to detect concurrent modifications.
 */
export function useConcurrentEditWarning(data: unknown, dirty: boolean): void {
  const snapshotRef = useRef<null | string>(null);
  const hasWarnedRef = useRef(false);
  const prevDirtyRef = useRef(false);

  useEffect(() => {
    if (dirty && !prevDirtyRef.current) {
      // Just became dirty: capture baseline snapshot
      snapshotRef.current = JSON.stringify(data);
      hasWarnedRef.current = false;
    } else if (!dirty && prevDirtyRef.current) {
      // Just became clean: clear snapshot
      snapshotRef.current = null;
      hasWarnedRef.current = false;
    } else if (
      dirty &&
      snapshotRef.current !== null &&
      !hasWarnedRef.current && // Still dirty: check for server-side changes
      JSON.stringify(data) !== snapshotRef.current
    ) {
      hasWarnedRef.current = true;
      toast.warning(
        "This entity was updated by another builder. Your unsaved changes may conflict.",
        { duration: 10_000 },
      );
    }
    prevDirtyRef.current = dirty;
  }, [data, dirty]);
}
