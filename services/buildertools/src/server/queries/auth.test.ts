import { describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";

import { multiCharA, multiCharB } from "../test-helpers.ts";
import { refreshSessionUser } from "./auth.ts";

describe("refreshSessionUser (B-H3: TEST-REFRESH)", () => {
  test("returns charA's powers and blocks when called with charA.playerId", async () => {
    const result = await refreshSessionUser(multiCharA.playerId);
    if (result === null) throw new Error("expected non-null result");
    expect(result.playerId).toBe(multiCharA.playerId);
    expect(result.isSenior).toBe(true);
    expect(result.blocks).toEqual([{ end: 699, start: 600 }]);
    expect(result.powers).toContain(POWER.LOW);
    expect(result.powers).toContain(POWER.NO_LIMITS);
  });

  test("returns charB's powers and blocks when called with charB.playerId", async () => {
    const result = await refreshSessionUser(multiCharB.playerId);
    if (result === null) throw new Error("expected non-null result");
    expect(result.playerId).toBe(multiCharB.playerId);
    expect(result.isSenior).toBe(false);
    expect(result.blocks).toEqual([{ end: 799, start: 700 }]);
    expect(result.powers).not.toContain(POWER.LOW);
    expect(result.powers).not.toContain(POWER.NO_LIMITS);
  });

  test("returns null for nonexistent playerId", async () => {
    const result = await refreshSessionUser(9_999_999);
    expect(result).toBeNull();
  });
});
