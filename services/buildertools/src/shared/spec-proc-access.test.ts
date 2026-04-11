import { describe, expect, test } from "bun:test";

import type { EnumEntry } from "./types/enums.ts";

import {
  gateSpecProcs,
  isUnassignableMobSpecProc,
  isUnassignableObjSpecProc,
  isUnassignableRoomSpecProc,
} from "./spec-proc-access.ts";

describe("isUnassignableMobSpecProc", () => {
  test("value 0 (none) is assignable", () => {
    expect(isUnassignableMobSpecProc(0)).toBe(false);
  });

  test("known unassignable value 3 is blocked", () => {
    expect(isUnassignableMobSpecProc(3)).toBe(true);
  });

  test("value 1 (assignable) returns false", () => {
    expect(isUnassignableMobSpecProc(1)).toBe(false);
  });

  test("high-range unassignable value 218 is blocked", () => {
    expect(isUnassignableMobSpecProc(218)).toBe(true);
  });
});

describe("isUnassignableObjSpecProc", () => {
  test("value 0 (none) is assignable", () => {
    expect(isUnassignableObjSpecProc(0)).toBe(false);
  });

  test("known unassignable value 5 is blocked", () => {
    expect(isUnassignableObjSpecProc(5)).toBe(true);
  });

  test("known assignable value 1 is not blocked", () => {
    expect(isUnassignableObjSpecProc(1)).toBe(false);
  });

  test("high-range unassignable value 163 is blocked", () => {
    expect(isUnassignableObjSpecProc(163)).toBe(true);
  });
});

describe("isUnassignableRoomSpecProc", () => {
  // Room uses inverted logic: everything except {0, 33} is unassignable.
  test("value 0 is assignable", () => {
    expect(isUnassignableRoomSpecProc(0)).toBe(false);
  });

  test("value 33 (blazingroom) is assignable", () => {
    expect(isUnassignableRoomSpecProc(33)).toBe(false);
  });

  test("value 1 is blocked", () => {
    expect(isUnassignableRoomSpecProc(1)).toBe(true);
  });

  test("value 32 (just below blazingroom) is blocked", () => {
    expect(isUnassignableRoomSpecProc(32)).toBe(true);
  });

  test("value 34 (just above blazingroom) is blocked", () => {
    expect(isUnassignableRoomSpecProc(34)).toBe(true);
  });
});

describe("gateSpecProcs", () => {
  const entries: EnumEntry[] = [
    { label: "none", value: 0 },
    { label: "dangerous", value: 3 },
    { disabledReason: "Custom reason", label: "custom", value: 7 },
  ];

  test("adds disabledReason to unassignable entries without an existing reason", () => {
    const result = gateSpecProcs(entries, isUnassignableMobSpecProc);
    expect(result[1]).toEqual({
      disabledReason: "Requires higher immortal power",
      label: "dangerous",
      value: 3,
    });
  });

  test("leaves assignable entries untouched", () => {
    const result = gateSpecProcs(entries, isUnassignableMobSpecProc);
    expect(result[0]).toEqual({ label: "none", value: 0 });
    expect(result[0]).not.toHaveProperty("disabledReason");
  });

  test("preserves an existing disabledReason on unassignable entries", () => {
    const result = gateSpecProcs(entries, isUnassignableMobSpecProc);
    expect(result[2]).toEqual({
      disabledReason: "Custom reason",
      label: "custom",
      value: 7,
    });
  });

  test("returns a new array (does not mutate input)", () => {
    const input: EnumEntry[] = [{ label: "none", value: 0 }];
    const result = gateSpecProcs(input, isUnassignableMobSpecProc);
    expect(result).not.toBe(input);
  });
});
