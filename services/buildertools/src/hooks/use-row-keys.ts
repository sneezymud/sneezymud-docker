import { useState } from "react";

/**
 * Stable row keys for lists where items lack natural IDs.
 * Generates a UUID per row and keeps the key array in sync when
 * the external row count changes (e.g. after a save round-trip).
 */
export function useRowKeys(rowCount: number) {
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    Array.from({ length: rowCount }, () => crypto.randomUUID()),
  );

  // Sync key array when external row count changes (e.g. after save round-trip).
  // Render-time comparison pattern - intentional, not a bug.
  const [lastRowCount, setLastRowCount] = useState(rowCount);
  if (rowCount !== lastRowCount) {
    setLastRowCount(rowCount);
    if (rowCount > rowKeys.length) {
      const extra = Array.from({ length: rowCount - rowKeys.length }, () =>
        crypto.randomUUID(),
      );
      setRowKeys([...rowKeys, ...extra]);
    } else if (rowCount < rowKeys.length) {
      setRowKeys(rowKeys.slice(0, rowCount));
    }
  }

  const addKey = () => {
    setRowKeys((prev) => [...prev, crypto.randomUUID()]);
  };

  const removeKey = (index: number) => {
    setRowKeys((prev) => prev.filter((_, i) => i !== index));
  };

  return { addKey, removeKey, rowKeys, setRowKeys };
}
