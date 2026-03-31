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

describe("enforceExitFlagRules", () => {
  test("DESTROYED clears CLOSED, LOCKED, and SECRET", () => {
    const oldFlags = 0;
    const newFlags = EXIT_DESTROYED | EXIT_CLOSED | EXIT_LOCKED | EXIT_SECRET;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_DESTROYED).toBeTruthy();
    expect(result & EXIT_CLOSED).toBeFalsy();
    expect(result & EXIT_LOCKED).toBeFalsy();
    expect(result & EXIT_SECRET).toBeFalsy();
  });

  test("CAVED_IN sets CLOSED and clears LOCKED and SECRET", () => {
    const oldFlags = 0;
    const newFlags = EXIT_CAVED_IN | EXIT_LOCKED | EXIT_SECRET;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_CAVED_IN).toBeTruthy();
    expect(result & EXIT_CLOSED).toBeTruthy(); // auto-set
    expect(result & EXIT_LOCKED).toBeFalsy(); // cleared
    expect(result & EXIT_SECRET).toBeFalsy(); // cleared
  });

  test("SLOPED_UP and SLOPED_DOWN are mutually exclusive", () => {
    // Turning on SLOPED_UP clears SLOPED_DOWN
    const oldFlags = EXIT_SLOPED_DOWN;
    const newFlags = EXIT_SLOPED_DOWN | EXIT_SLOPED_UP;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_SLOPED_UP).toBeTruthy();
    expect(result & EXIT_SLOPED_DOWN).toBeFalsy();

    // Turning on SLOPED_DOWN clears SLOPED_UP
    const oldFlags2 = EXIT_SLOPED_UP;
    const newFlags2 = EXIT_SLOPED_UP | EXIT_SLOPED_DOWN;
    const result2 = enforceExitFlagRules(oldFlags2, newFlags2);

    expect(result2 & EXIT_SLOPED_DOWN).toBeTruthy();
    expect(result2 & EXIT_SLOPED_UP).toBeFalsy();
  });

  test("turning OFF a flag does not trigger cascade", () => {
    // Start with DESTROYED set, turn it off
    const oldFlags = EXIT_DESTROYED | EXIT_CLOSED | EXIT_LOCKED;
    const newFlags = EXIT_CLOSED | EXIT_LOCKED; // removed DESTROYED
    const result = enforceExitFlagRules(oldFlags, newFlags);

    // CLOSED and LOCKED should survive - only turnedOn flags trigger rules
    expect(result & EXIT_CLOSED).toBeTruthy();
    expect(result & EXIT_LOCKED).toBeTruthy();
    expect(result & EXIT_DESTROYED).toBeFalsy();
  });

  test("unrelated flags are preserved through enforcement", () => {
    const UNRELATED_FLAG = 1 << 4; // bit 4 - not one of the rule flags
    const oldFlags = UNRELATED_FLAG;
    const newFlags = UNRELATED_FLAG | EXIT_DESTROYED;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & UNRELATED_FLAG).toBeTruthy();
    expect(result & EXIT_DESTROYED).toBeTruthy();
  });

  test("no flags changed returns flags unchanged", () => {
    const flags = EXIT_CLOSED | EXIT_LOCKED | EXIT_SECRET;
    const result = enforceExitFlagRules(flags, flags);
    expect(result).toBe(flags);
  });

  test("CAVED_IN with already-CLOSED does not re-trigger CLOSED logic", () => {
    // CLOSED already set, then CAVED_IN turned on
    const oldFlags = EXIT_CLOSED;
    const newFlags = EXIT_CLOSED | EXIT_CAVED_IN;
    const result = enforceExitFlagRules(oldFlags, newFlags);

    expect(result & EXIT_CAVED_IN).toBeTruthy();
    expect(result & EXIT_CLOSED).toBeTruthy();
  });
});
