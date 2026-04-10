import { describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";

import { multiCharA, multiCharB } from "../test-helpers.ts";
import { authenticateBuilder, refreshSessionUser } from "./auth.ts";

describe("authenticateBuilder", () => {
  test("valid credentials return success with user data", async () => {
    const result = await authenticateBuilder("testbuilder", "testpass");
    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("expected success");
    expect(result.user.username).toBe("testbuilder");
    expect(result.user.playerName).toBe("TestBuilder");
    expect(result.user.playerId).toBe(99_999);
    expect(result.user.blocks).toEqual([{ end: 199, start: 100 }]);
    expect(result.user.powers).toContain(POWER.BUILDER);
    expect(result.user.isSenior).toBe(false);
  });

  test("wrong password returns wrong_password", async () => {
    const result = await authenticateBuilder("testbuilder", "wrongpass");
    expect(result.kind).toBe("wrong_password");
  });

  test("nonexistent username returns not_found", async () => {
    const result = await authenticateBuilder("nobody", "testpass");
    expect(result.kind).toBe("not_found");
  });

  test("user without POWER_BUILDER returns not_immortal", async () => {
    const result = await authenticateBuilder("nonbuilder", "testpass");
    expect(result.kind).toBe("not_immortal");
    if (result.kind !== "not_immortal")
      throw new Error("expected not_immortal");
    expect(result.playerName).toBe("NonBuilder");
  });

  test("multi-character account selects character with most powers", async () => {
    const result = await authenticateBuilder("multicharbuilder", "testpass");
    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("expected success");
    // MultiCharA (playerId 99990) has more powers than MultiCharB (99989)
    expect(result.user.playerId).toBe(99_990);
    expect(result.user.playerName).toBe("MultiCharA");
  });

  test("senior builder is correctly identified", async () => {
    const result = await authenticateBuilder("expandedbuilder", "testpass");
    expect(result.kind).toBe("success");
    if (result.kind !== "success") throw new Error("expected success");
    expect(result.user.isSenior).toBe(true);
  });
});

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

  test("refreshSessionUser returns null when player lacks POWER_BUILDER", async () => {
    const result = await refreshSessionUser(99_994);
    expect(result).toBeNull();
  });
});
