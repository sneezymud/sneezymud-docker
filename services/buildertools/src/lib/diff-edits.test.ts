// src/lib/diff-edits.test.ts

import { describe, expect, test } from "bun:test";

import { diffEdits } from "./diff-edits.ts";

describe("diffEdits", () => {
  test("form with no edits is not dirty", () => {
    const original = { a: 1, b: "hello", c: 0 };
    const next = { a: 1, b: "hello", c: 0 };
    expect(diffEdits(next, original)).toBeNull();
  });

  test("form tracks only the fields that changed", () => {
    const original = { a: 1, b: "hello", c: 0 };
    const next = { a: 1, b: "world" };
    const result = diffEdits(next, original);
    expect(result).toEqual({ b: "world" });
    // Must NOT include 'a' since it didn't change
    expect(result).not.toHaveProperty("a");
  });

  test("empty edits partial is not dirty", () => {
    const original = { a: 1, b: "hello" };
    expect(diffEdits({}, original)).toBeNull();
  });

  test("array fields are always treated as changed", () => {
    const arr = [1, 2, 3];
    const original = { data: arr };
    // Same content but new reference
    const next = { data: [1, 2, 3] };
    const result = diffEdits(next, original);
    // Arrays are compared by reference (!==), so different array objects always diff
    expect(result).toEqual({ data: [1, 2, 3] });
  });

  test("same array reference is not treated as changed", () => {
    const arr = [1, 2, 3];
    const original = { data: arr };
    const next = { data: arr }; // same reference
    expect(diffEdits(next, original)).toBeNull();
  });

  test("type-mismatched values are detected as changes", () => {
    const original: Record<string, unknown> = { val: 0 };
    // Intentional type subversion: simulates a value that passes through as the wrong runtime type
    const next: Record<string, unknown> = { val: "0" };
    // 0 !== "0" is true in strict equality
    const result = diffEdits(next, original);
    expect(result).toEqual({ val: "0" });
  });

  test("new fields not in original are included in the diff", () => {
    const original = { a: 1 };
    // Widen to Partial so 'b' (absent from original's type) is accepted by diffEdits
    const next = { a: 1, b: "new" } as Partial<{ a: number; b: string }>;
    // Widen original to match diffEdits' parameter type
    const result = diffEdits(next, original as Record<string, unknown>);
    expect(result).toEqual({ b: "new" });
  });

  test("multiple changed fields are all captured", () => {
    const original = { a: 1, b: "hello", c: true };
    const next = { a: 2, b: "hello", c: false };
    const result = diffEdits(next, original);
    expect(result).toEqual({ a: 2, c: false });
  });

  test("explicitly undefined value differs from a defined value", () => {
    const original = { a: 1 } as Record<string, unknown>;
    const next = { a: undefined };
    const result = diffEdits(next, original);
    expect(result).toEqual({ a: undefined });
  });

  test("keys absent from next are not treated as deletions", () => {
    // diffEdits only iterates over keys in `next`, so keys present in
    // original but missing from next are silently ignored - this is the
    // "diffing a partial" contract that dirty detection relies on.
    const original = { a: 1, b: 2 };
    const next = { a: 1 };
    expect(diffEdits(next, original)).toBeNull();
  });
});
