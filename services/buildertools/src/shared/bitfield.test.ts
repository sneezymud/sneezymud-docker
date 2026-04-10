// src/shared/bitfield.test.ts

import { describe, expect, test } from "bun:test";

import { hasBit, toggleBit } from "./bitfield.ts";

describe("hasBit", () => {
  test("any single bit can be checked in a 32-bit field", () => {
    // Verify every bit position is readable
    for (let bit = 0; bit < 32; bit++) {
      expect(hasBit(1 << bit, bit)).toBe(true);
    }
    // Verify adjacent bits are unaffected - interior bits have both neighbors
    for (let bit = 1; bit < 31; bit++) {
      const value = 1 << bit;
      expect(hasBit(value, bit - 1)).toBe(false);
      expect(hasBit(value, bit + 1)).toBe(false);
    }
    // Edge cases: bit 0 has no lower neighbor, bit 31 has no upper neighbor
    expect(hasBit(1, 1)).toBe(false);
    expect(hasBit(1 << 31, 30)).toBe(false);
  });

  test("zero value has no bits set", () => {
    for (let bit = 0; bit < 32; bit++) {
      expect(hasBit(0, bit)).toBe(false);
    }
  });

  test("sign bit is readable on negative values", () => {
    // 1 << 31 produces -2147483648 in JS (signed 32-bit)
    const negativeValue = 1 << 31; // -2147483648
    expect(negativeValue).toBeLessThan(0);
    expect(hasBit(negativeValue, 31)).toBe(true);
    expect(hasBit(negativeValue, 0)).toBe(false);
  });

  test("multiple set bits are independently readable", () => {
    const value = 1 | (1 << 15) | (1 << 31); // bits 0, 15, 31
    expect(hasBit(value, 0)).toBe(true);
    expect(hasBit(value, 1)).toBe(false);
    expect(hasBit(value, 15)).toBe(true);
    expect(hasBit(value, 16)).toBe(false);
    expect(hasBit(value, 31)).toBe(true);
  });
});

describe("toggleBit", () => {
  test("toggling a bit changes only that bit", () => {
    // Start with bit 4 set, toggle bit 3
    const original = 1 << 4; // 16
    const toggled = toggleBit(original, 3);
    expect(hasBit(toggled, 3)).toBe(true); // newly set
    expect(hasBit(toggled, 4)).toBe(true); // preserved
    expect(hasBit(toggled, 2)).toBe(false); // untouched
    expect(hasBit(toggled, 5)).toBe(false); // untouched
  });

  test("toggling a bit twice preserves the original value", () => {
    const values = [0, 1, 255, -1, -2_147_483_648, 2_147_483_647, 42];
    for (const original of values) {
      for (let bit = 0; bit < 32; bit++) {
        const roundTripped = toggleBit(toggleBit(original, bit), bit);
        expect(roundTripped).toBe(original);
      }
    }
  });

  test("hasBit reflects the state change from toggleBit", () => {
    const value = (1 << 5) | (1 << 20); // bits 5 and 20 set
    // Toggle bit 5 off
    const after = toggleBit(value, 5);
    expect(hasBit(value, 5)).toBe(true);
    expect(hasBit(after, 5)).toBe(false);
    // Toggle bit 10 on
    const after2 = toggleBit(value, 10);
    expect(hasBit(value, 10)).toBe(false);
    expect(hasBit(after2, 10)).toBe(true);
  });

  test("toggling the sign bit transitions between positive and negative", () => {
    const positive = 15; // 0x0000000F
    const withBit31 = toggleBit(positive, 31);
    expect(withBit31).toBeLessThan(0); // sign bit set
    expect(hasBit(withBit31, 31)).toBe(true);
    expect(hasBit(withBit31, 0)).toBe(true); // low bits preserved
    expect(hasBit(withBit31, 1)).toBe(true);
    expect(hasBit(withBit31, 2)).toBe(true);
    expect(hasBit(withBit31, 3)).toBe(true);
  });

  test("bit positions >= 32 wrap due to JS 32-bit integer semantics", () => {
    const value = 0;
    expect(hasBit(value, 32)).toBe(hasBit(value, 0));
    expect(hasBit(value, 33)).toBe(hasBit(value, 1));
  });
});
