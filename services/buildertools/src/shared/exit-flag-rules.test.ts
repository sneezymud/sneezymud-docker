// src/shared/exit-flag-rules.test.ts

import { describe, expect, test } from "bun:test";

import {
  enforceExitFlagRules,
  EXIT_CAVED_IN,
  EXIT_CLOSED,
  EXIT_DESTROYED,
  EXIT_LOCKED,
  EXIT_SECRET,
  EXIT_SLOPED_DOWN,
  EXIT_SLOPED_UP,
} from "./exit-flag-rules.ts";

// Bits not involved in any cascade rule - used to verify non-interference
const UNRELATED_BIT4 = 1 << 4;
const UNRELATED_BIT7 = 1 << 7;

describe("enforceExitFlagRules", () => {
  test("DESTROYED clears CLOSED, LOCKED, and SECRET while preserving unrelated flags", () => {
    const oldFlags = UNRELATED_BIT4 | UNRELATED_BIT7;
    const newFlags =
      oldFlags | EXIT_DESTROYED | EXIT_CLOSED | EXIT_LOCKED | EXIT_SECRET;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_DESTROYED).toBe(EXIT_DESTROYED);
    expect(result & EXIT_CLOSED).toBe(0);
    expect(result & EXIT_LOCKED).toBe(0);
    expect(result & EXIT_SECRET).toBe(0);
    // Unrelated flags survive the cascade
    expect(result & UNRELATED_BIT4).toBe(UNRELATED_BIT4);
    expect(result & UNRELATED_BIT7).toBe(UNRELATED_BIT7);
  });

  test("CAVED_IN forces CLOSED and clears LOCKED and SECRET while preserving unrelated flags", () => {
    const oldFlags = UNRELATED_BIT4 | UNRELATED_BIT7;
    const newFlags = oldFlags | EXIT_CAVED_IN | EXIT_LOCKED | EXIT_SECRET;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_CAVED_IN).toBe(EXIT_CAVED_IN);
    expect(result & EXIT_CLOSED).toBe(EXIT_CLOSED); // auto-set
    expect(result & EXIT_LOCKED).toBe(0); // cleared
    expect(result & EXIT_SECRET).toBe(0); // cleared
    // Unrelated flags survive the cascade
    expect(result & UNRELATED_BIT4).toBe(UNRELATED_BIT4);
    expect(result & UNRELATED_BIT7).toBe(UNRELATED_BIT7);
  });

  test("SLOPED_UP and SLOPED_DOWN are mutually exclusive while preserving unrelated flags", () => {
    // Turning on SLOPED_UP clears SLOPED_DOWN
    const oldFlags = EXIT_SLOPED_DOWN | UNRELATED_BIT4 | UNRELATED_BIT7;
    const newFlags = oldFlags | EXIT_SLOPED_UP;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_SLOPED_UP).toBe(EXIT_SLOPED_UP);
    expect(result & EXIT_SLOPED_DOWN).toBe(0);
    expect(result & UNRELATED_BIT4).toBe(UNRELATED_BIT4);
    expect(result & UNRELATED_BIT7).toBe(UNRELATED_BIT7);

    // Turning on SLOPED_DOWN clears SLOPED_UP
    const oldFlags2 = EXIT_SLOPED_UP | UNRELATED_BIT4 | UNRELATED_BIT7;
    const newFlags2 = oldFlags2 | EXIT_SLOPED_DOWN;
    const result2 = enforceExitFlagRules(oldFlags2, newFlags2);

    expect(result2 & EXIT_SLOPED_DOWN).toBe(EXIT_SLOPED_DOWN);
    expect(result2 & EXIT_SLOPED_UP).toBe(0);
    expect(result2 & UNRELATED_BIT4).toBe(UNRELATED_BIT4);
    expect(result2 & UNRELATED_BIT7).toBe(UNRELATED_BIT7);
  });

  test("removing a flag does not trigger its cascade rule", () => {
    // Start with DESTROYED set, turn it off
    const oldFlags = EXIT_DESTROYED | EXIT_CLOSED | EXIT_LOCKED;
    const newFlags = EXIT_CLOSED | EXIT_LOCKED; // removed DESTROYED
    const result = enforceExitFlagRules(oldFlags, newFlags);

    // CLOSED and LOCKED should survive - only turnedOn flags trigger rules
    expect(result & EXIT_CLOSED).toBe(EXIT_CLOSED);
    expect(result & EXIT_LOCKED).toBe(EXIT_LOCKED);
    expect(result & EXIT_DESTROYED).toBe(0);
  });

  test("unchanged flags pass through without modification", () => {
    const flags = EXIT_CLOSED | EXIT_LOCKED | EXIT_SECRET;
    const result = enforceExitFlagRules(flags, flags);
    expect(result).toBe(flags);
  });

  test("CAVED_IN with pre-existing CLOSED does not disrupt", () => {
    // CLOSED already set, then CAVED_IN turned on
    const oldFlags = EXIT_CLOSED;
    const newFlags = EXIT_CLOSED | EXIT_CAVED_IN;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_CAVED_IN).toBe(EXIT_CAVED_IN);
    expect(result & EXIT_CLOSED).toBe(EXIT_CLOSED);
  });

  test("simultaneous DESTROYED and CAVED_IN interact correctly", () => {
    // Both turned on at once - DESTROYED processes first (clears CLOSED),
    // then CAVED_IN processes second (re-adds CLOSED). Net result: CLOSED is set.
    const oldFlags = 0;
    const newFlags = EXIT_DESTROYED | EXIT_CAVED_IN;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_DESTROYED).toBe(EXIT_DESTROYED);
    expect(result & EXIT_CAVED_IN).toBe(EXIT_CAVED_IN);
    expect(result & EXIT_CLOSED).toBe(EXIT_CLOSED); // CAVED_IN re-adds it
    expect(result & EXIT_LOCKED).toBe(0); // both rules clear this
    expect(result & EXIT_SECRET).toBe(0); // both rules clear this
  });

  test("simultaneously enabling both slopes cancels both", () => {
    // Both rules fire independently against the immutable turnedOn mask.
    // SLOPED_UP rule clears SLOPED_DOWN, then SLOPED_DOWN rule clears SLOPED_UP.
    // Net result: neither slope survives.
    const oldFlags = 0;
    const newFlags = EXIT_SLOPED_UP | EXIT_SLOPED_DOWN;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_SLOPED_DOWN).toBe(0);
    expect(result & EXIT_SLOPED_UP).toBe(0);
  });

  test("CAVED_IN clears pre-existing LOCKED", () => {
    const oldFlags = EXIT_LOCKED;
    const newFlags = EXIT_LOCKED | EXIT_CAVED_IN;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_CAVED_IN).toBe(EXIT_CAVED_IN);
    expect(result & EXIT_CLOSED).toBe(EXIT_CLOSED);
    expect(result & EXIT_LOCKED).toBe(0);
  });
});
