import { describe, expect, test } from "bun:test";

import type { Obj } from "@/shared/schemas/obj.ts";

import {
  expandTypeValues,
  getBits,
  getObjTypeSpec,
} from "@/shared/obj-type-specs.ts";

import { applyObjFieldChange, expandObjFormValues } from "./obj-form-logic.ts";

// Minimal Obj for testing - all required fields at defaults
const baseObj: Obj = {
  action_desc: "",
  action_flag: 0,
  affects: [],
  can_be_seen: 0,
  cur_struct: 0,
  decay: 0,
  extras: [],
  long_desc: "",
  material: 0,
  max_exist: 0,
  max_struct: 0,
  name: "",
  price: 0,
  short_desc: "",
  spec_proc: 0,
  type: 5, // Weapon
  val0: 0,
  val1: 0,
  val2: 0,
  val3: 0,
  vnum: 100,
  volume: 0,
  wear_flag: 0,
  weight: 0,
};

// Helper: get spec or fail the test
function requireSpec(itemType: number) {
  const spec = getObjTypeSpec(itemType);
  expect(spec).toBeDefined();
  return spec ?? { fields: [] };
}

describe("applyObjFieldChange", () => {
  test("spec field packs into correct val slot via setBits", () => {
    const typeSpec = requireSpec(5); // Weapon
    // curSharp is in val0, bits 0-7 (highBit=7, numBits=8)
    const result = applyObjFieldChange(
      "curSharp",
      150,
      baseObj,
      typeSpec,
      null,
    );

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    expect(result).toHaveProperty("val0");
    const val0 = result.val0 ?? 0;
    expect(getBits(val0, 7, 8)).toBe(150);
  });

  test("spec field preserves adjacent packed fields", () => {
    const typeSpec = requireSpec(5); // Weapon
    // First set maxSharp (bits 8-15 of val0) to 100
    const afterMaxSharp = applyObjFieldChange(
      "maxSharp",
      100,
      baseObj,
      typeSpec,
      null,
    );
    // Then set curSharp (bits 0-7 of val0) to 200, using previous edits
    const afterCurSharp = applyObjFieldChange(
      "curSharp",
      200,
      baseObj,
      typeSpec,
      afterMaxSharp,
    );

    expect(afterCurSharp).not.toBeNull();
    if (afterCurSharp === null) throw new Error("expected non-null result");

    const val0 = afterCurSharp.val0 ?? 0;
    expect(getBits(val0, 7, 8)).toBe(200);
    expect(getBits(val0, 15, 8)).toBe(100);
  });

  test("type switch initializes val0-val3 with field minimums", () => {
    // Switch from weapon (type=5) to scroll (type=2).
    // Scroll has magicLevel (min=1) and magicLearnedness (min=1) packed in val0.
    // A plain type=2 switch with val0=0 would yield both fields at 0, below min.
    const typeSpec = requireSpec(5); // current type
    const result = applyObjFieldChange("type", 2, baseObj, typeSpec, null);

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    expect(result).toHaveProperty("type", 2);

    const scrollSpec = requireSpec(2);
    const rawVals: [number, number, number, number] = [
      result.val0 ?? 0,
      result.val1 ?? 0,
      result.val2 ?? 0,
      result.val3 ?? 0,
    ];
    const expanded = expandTypeValues(scrollSpec, rawVals);

    // Scroll fields with minimums: magicLevel >= 1, magicLearnedness >= 1
    expect(expanded["magicLevel"]).toBeGreaterThanOrEqual(1);
    expect(expanded["magicLearnedness"]).toBeGreaterThanOrEqual(1);
  });

  test("regular field change returns simple diff", () => {
    const typeSpec = requireSpec(5);
    const result = applyObjFieldChange(
      "name",
      "sword",
      baseObj,
      typeSpec,
      null,
    );

    expect(result).toEqual({ name: "sword" });
  });

  test("regular field unchanged from original returns null", () => {
    const typeSpec = requireSpec(5);
    const result = applyObjFieldChange("name", "", baseObj, typeSpec, null);

    // name is "" in baseObj, so no diff
    expect(result).toBeNull();
  });
});

describe("expandObjFormValues", () => {
  test("expands type-specific fields from raw vals", () => {
    const typeSpec = requireSpec(5); // Weapon
    // val0: curSharp=200 (bits 0-7), maxSharp=100 (bits 8-15)
    const values = {
      type: 5,
      val0: 200 | (100 << 8),
      val1: 0,
      val2: 0,
      val3: 0,
    };
    const original = { ...values };

    const { expandedValues } = expandObjFormValues(values, original, typeSpec);

    expect(expandedValues).toHaveProperty("curSharp", 200);
    expect(expandedValues).toHaveProperty("maxSharp", 100);
  });

  test("no-spec type returns values unchanged", () => {
    // Undefined type (0) has an empty fields array - no expansion
    const typeSpec = requireSpec(0);
    const values = { type: 0, val0: 42, val1: 0, val2: 0, val3: 0 };
    const original = { ...values };

    const { expandedValues } = expandObjFormValues(values, original, typeSpec);

    expect(expandedValues).toEqual(values);
    expect(expandedValues).not.toHaveProperty("curSharp");
  });

  test("undefined typeSpec returns values unchanged", () => {
    const values = { type: 999, val0: 42, val1: 0, val2: 0, val3: 0 };
    const original = { ...values };

    const { expandedValues } = expandObjFormValues(values, original, undefined);

    expect(expandedValues).toEqual(values);
  });
});
