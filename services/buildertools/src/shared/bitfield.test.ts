// src/shared/bitfield.test.ts

import { describe, expect, test } from "bun:test";

import { hasBit, toggleBit } from "./bitfield.ts";

describe("hasBit", () => {
  test("reads each bit position including bit 31", () => {
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
    expect(hasBit(Math.trunc(1), 1)).toBe(false);
    expect(hasBit(1 << 31, 30)).toBe(false);
  });

  test("returns false for all positions when value is zero", () => {
    for (let bit = 0; bit < 32; bit++) {
      expect(hasBit(0, bit)).toBe(false);
    }
  });

  test("reads bit 31 correctly on negative signed value", () => {
    // 1 << 31 produces -2147483648 in JS (signed 32-bit)
    const negativeValue = 1 << 31; // -2147483648
    expect(negativeValue).toBeLessThan(0);
    expect(hasBit(negativeValue, 31)).toBe(true);
    expect(hasBit(negativeValue, 0)).toBe(false);
  });

  test("reads multiple set bits correctly", () => {
    const value = Math.trunc(1) | (1 << 15) | (1 << 31); // bits 0, 15, 31
    expect(hasBit(value, 0)).toBe(true);
    expect(hasBit(value, 1)).toBe(false);
    expect(hasBit(value, 15)).toBe(true);
    expect(hasBit(value, 16)).toBe(false);
    expect(hasBit(value, 31)).toBe(true);
  });
});

describe("toggleBit", () => {
  test("flips target bit without affecting neighbors", () => {
    // Start with bit 4 set, toggle bit 3
    const original = 1 << 4; // 16
    const toggled = toggleBit(original, 3);
    expect(hasBit(toggled, 3)).toBe(true); // newly set
    expect(hasBit(toggled, 4)).toBe(true); // preserved
    expect(hasBit(toggled, 2)).toBe(false); // untouched
    expect(hasBit(toggled, 5)).toBe(false); // untouched
  });

  test("toggling twice restores original including negative values", () => {
    const values = [0, 1, 255, -1, -2_147_483_648, 2_147_483_647, 42];
    for (const original of values) {
      for (let bit = 0; bit < 32; bit++) {
        const roundTripped = toggleBit(toggleBit(original, bit), bit);
        expect(roundTripped).toBe(original);
      }
    }
  });

  test("hasBit and toggleBit agree: toggling changes what hasBit reports", () => {
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

  test("toggling bit 31 transitions between positive and negative", () => {
    const positive = 15; // 0x0000000F
    const withBit31 = toggleBit(positive, 31);
    expect(withBit31).toBeLessThan(0); // sign bit set
    expect(hasBit(withBit31, 31)).toBe(true);
    expect(hasBit(withBit31, 0)).toBe(true); // low bits preserved
    expect(hasBit(withBit31, 1)).toBe(true);
    expect(hasBit(withBit31, 2)).toBe(true);
    expect(hasBit(withBit31, 3)).toBe(true);
  });
});
