import { describe, expect, test } from "bun:test";

import { POWER } from "@/shared/powers.ts";

import { getMobFieldGroups } from "./mob-fields.tsx";

describe("getMobFieldGroups", () => {
  test("returns groups including spec_proc field", () => {
    const groups = getMobFieldGroups([POWER.MEDIT, POWER.MEDIT_IMP_POWER]);
    const behavior = groups.find((g) => g.title === "Behavior");
    const specProc = behavior?.fields.find((f) => f.key === "spec_proc");
    expect(specProc).toBeDefined();
    expect(specProc?.type).toBe("enum");
  });

  test("ungated user sees full spec_proc enum", () => {
    const groups = getMobFieldGroups([POWER.MEDIT, POWER.MEDIT_IMP_POWER]);
    const specProc = groups
      .find((g) => g.title === "Behavior")
      ?.fields.find((f) => f.key === "spec_proc");
    if (specProc?.type !== "enum") throw new Error("expected enum field");
    expect(specProc.enumEntries.length).toBeGreaterThan(0);
    const allValues = specProc.enumEntries.map((e) => e.value);
    expect(allValues.length).toBeGreaterThan(1);
  });

  test("user without MEDIT_IMP_POWER gets gated spec_proc enum", () => {
    const ungated = getMobFieldGroups([POWER.MEDIT, POWER.MEDIT_IMP_POWER]);
    const gated = getMobFieldGroups([POWER.MEDIT]);

    const ungatedEntries = ungated
      .find((g) => g.title === "Behavior")
      ?.fields.find((f) => f.key === "spec_proc");
    const gatedEntries = gated
      .find((g) => g.title === "Behavior")
      ?.fields.find((f) => f.key === "spec_proc");
    if (ungatedEntries?.type !== "enum" || gatedEntries?.type !== "enum") {
      throw new Error("expected enum fields");
    }
    const ungatedDisabled = ungatedEntries.enumEntries.filter(
      (e) => e.disabledReason !== undefined,
    ).length;
    const gatedDisabled = gatedEntries.enumEntries.filter(
      (e) => e.disabledReason !== undefined,
    ).length;
    expect(gatedDisabled).toBeGreaterThan(ungatedDisabled);
  });
});
