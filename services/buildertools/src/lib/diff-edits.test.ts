// src/lib/diff-edits.test.ts

import { describe, expect, test } from "bun:test";

import { diffEdits } from "./diff-edits.ts";

describe("diffEdits", () => {
  test("identical scalars return null", () => {
    const original = { a: 1, b: "hello", c: 0 };
    const next = { a: 1, b: "hello", c: 0 };
    expect(diffEdits(next, original)).toBeNull();
  });

  test("changed scalar returns partial with only changed key", () => {
    const original = { a: 1, b: "hello", c: 0 };
    const next = { a: 1, b: "world" };
    const result = diffEdits(next, original);
    expect(result).toEqual({ b: "world" });
    // Must NOT include 'a' since it didn't change
    expect(result).not.toHaveProperty("a");
  });

  test("empty edits object returns null", () => {
    const original = { a: 1, b: "hello" };
    expect(diffEdits({}, original)).toBeNull();
  });

  test("array values always diff due to reference inequality", () => {
    const arr = [1, 2, 3];
    const original = { data: arr };
    // Same content but new reference
    const next = { data: [1, 2, 3] };
    const result = diffEdits(next, original);
    // Arrays are compared by reference (!==), so different array objects always diff
    expect(result).toEqual({ data: [1, 2, 3] });
  });

  test("same array reference returns null", () => {
    const arr = [1, 2, 3];
    const original = { data: arr };
    const next = { data: arr }; // same reference
    expect(diffEdits(next, original)).toBeNull();
  });

  test("numeric 0 vs string '0' are different (strict !== semantics)", () => {
    const original: Record<string, unknown> = { val: 0 };
    // Intentional type subversion: simulates a value that passes through as the wrong runtime type
    const next: Record<string, unknown> = { val: "0" };
    // 0 !== "0" is true in strict equality
    const result = diffEdits(next, original);
    expect(result).toEqual({ val: "0" });
  });

  test("keys not in original are included in diff", () => {
    const original = { a: 1 };
    const next = { a: 1, b: "new" } as Partial<{ a: number; b: string }>;
    const result = diffEdits(next, original as Record<string, unknown>);
    expect(result).toEqual({ b: "new" });
  });

  test("multiple changes returns all changed keys", () => {
    const original = { a: 1, b: "hello", c: true };
    const next = { a: 2, b: "hello", c: false };
    const result = diffEdits(next, original);
    expect(result).toEqual({ a: 2, c: false });
  });

  test("undefined value in next differs from defined value in original", () => {
    const original = { a: 1 } as Record<string, unknown>;
    const next = { a: undefined };
    const result = diffEdits(next, original);
    expect(result).toEqual({ a: undefined });
  });
});
