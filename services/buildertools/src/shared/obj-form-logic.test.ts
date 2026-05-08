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
  test("editing a spec field updates the packed value correctly", () => {
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
    expect(getBits({ highBit: 7, numBits: 8, value: val0 })).toBe(150);
  });

  test("editing one packed field preserves adjacent fields in the same slot", () => {
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
    expect(getBits({ highBit: 7, numBits: 8, value: val0 })).toBe(200);
    expect(getBits({ highBit: 15, numBits: 8, value: val0 })).toBe(100);
  });

  test("switching item type resets value fields to the new type's defaults", () => {
    // Switch from weapon (type=5) to scroll (type=2).
    // Scroll has magicLevel (min=1) and magicLearnedness (min=1) packed in val0.
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

    // Scroll fields with minimums: magicLevel=1 in bits 0-7, magicLearnedness=1 in bits 8-15
    // Expected packed val0: 1 | (1 << 8) = 257
    expect(expanded["magicLevel"]).toBe(1);
    expect(expanded["magicLearnedness"]).toBe(1);
    expect(result.val0).toBe(1 | (1 << 8));
  });

  test("whole-val spec field sets the entire val slot directly", () => {
    // Type 17 (fountain) uses baseCupFields - all whole-val (no highBit/numBits)
    const fountainObj: Obj = { ...baseObj, type: 17 };
    const typeSpec = requireSpec(17);

    // maxDrinks occupies all of val0
    const result = applyObjFieldChange(
      "maxDrinks",
      500,
      fountainObj,
      typeSpec,
      null,
    );

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    expect(result).toHaveProperty("val0", 500);
  });

  test("changing a regular field produces a simple diff", () => {
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

  test("unchanged regular field is not dirty", () => {
    const typeSpec = requireSpec(5);
    const result = applyObjFieldChange("name", "", baseObj, typeSpec, null);

    // name is "" in baseObj, so no diff
    expect(result).toBeNull();
  });

  test("switching to unknown type zeros all value fields", () => {
    // Start with non-zero val0 so the diff reflects the reset.
    // diffEdits omits fields whose value matches the original, so only
    // fields that actually change appear in the result.
    const weaponWithVals: Obj = { ...baseObj, val0: 200 | (100 << 8) };
    const typeSpec = requireSpec(5); // current type: Weapon
    const result = applyObjFieldChange(
      "type",
      0,
      weaponWithVals,
      typeSpec,
      null,
    );

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    expect(result).toHaveProperty("type", 0);
    // val0 changed from non-zero to 0 - present in diff
    expect(result).toHaveProperty("val0", 0);
    // val1-val3 were already 0 - correctly absent from diff
    expect(result).not.toHaveProperty("val1");
    expect(result).not.toHaveProperty("val2");
    expect(result).not.toHaveProperty("val3");
  });

  test("switching type preserves prior non-value edits", () => {
    const typeSpec = requireSpec(5); // current type: Weapon
    const prevEdits: Partial<Obj> = { name: "sword" };
    const result = applyObjFieldChange("type", 0, baseObj, typeSpec, prevEdits);

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    expect(result).toHaveProperty("name", "sword");
    expect(result).toHaveProperty("type", 0);
  });

  test("edits across different val slots are independently preserved", () => {
    const typeSpec = requireSpec(5); // Weapon
    // Edit a val0 field: maxSharp (bits 8-15 of val0)
    const afterVal0Edit = applyObjFieldChange(
      "maxSharp",
      100,
      baseObj,
      typeSpec,
      null,
    );

    // Edit a val2 field: weapType0 (bits 0-7 of val2), passing prevEdits from val0
    const afterVal2Edit = applyObjFieldChange(
      "weapType0",
      42,
      baseObj,
      typeSpec,
      afterVal0Edit,
    );

    expect(afterVal2Edit).not.toBeNull();
    if (afterVal2Edit === null) throw new Error("expected non-null result");

    // val0 edit survived
    expect(afterVal2Edit).toHaveProperty("val0");
    const val0 = afterVal2Edit.val0 ?? 0;
    expect(getBits({ highBit: 15, numBits: 8, value: val0 })).toBe(100);

    // val2 edit also present
    expect(afterVal2Edit).toHaveProperty("val2");
    const val2 = afterVal2Edit.val2 ?? 0;
    expect(getBits({ highBit: 7, numBits: 8, value: val2 })).toBe(42);
  });

  test("string value for a spec field is coerced to number for packing", () => {
    const typeSpec = requireSpec(5); // Weapon
    // Pass a string "150" instead of number 150 for curSharp
    const result = applyObjFieldChange(
      "curSharp",
      "150",
      baseObj,
      typeSpec,
      null,
    );

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    const val0 = result.val0 ?? 0;
    expect(getBits({ highBit: 7, numBits: 8, value: val0 })).toBe(150);
  });

  test("non-numeric string for a spec field coerces to NaN and packs as zero", () => {
    const typeSpec = requireSpec(5); // Weapon
    // "abc" coerces to NaN; setBits masks NaN with ((1 << numBits) - 1)
    // NaN & anything = 0, so the field packs as 0
    const result = applyObjFieldChange(
      "curSharp",
      "abc",
      baseObj,
      typeSpec,
      null,
    );

    // NaN packed into val0 - setBits will mask it to 0
    // Since baseObj.val0 is already 0, and NaN packs to 0, diffEdits returns null
    expect(result).toBeNull();
  });

  test("type switch overwrites prior val edits while preserving non-val edits", () => {
    const typeSpec = requireSpec(5); // current type: Weapon
    // Simulate prior edits that include both val0 and a non-val field
    const prevEdits: Partial<Obj> = { name: "test", val0: 999 };
    const result = applyObjFieldChange("type", 2, baseObj, typeSpec, prevEdits);

    expect(result).not.toBeNull();
    if (result === null) throw new Error("expected non-null result");

    // name survives the type switch
    expect(result).toHaveProperty("name", "test");
    expect(result).toHaveProperty("type", 2);
    // val0 is overwritten by scroll's defaults (magicLevel=1, magicLearnedness=1),
    // not the prior edit's 999
    expect(result.val0).toBe(1 | (1 << 8));
  });

  test("setting a raw val key directly bypasses bit-packing", () => {
    const obj = { ...baseObj, val0: 0 };
    const result = applyObjFieldChange("val0", "255", obj, undefined, null);
    // diffEdits stores the raw string value since val0 differs from obj.val0
    expect(result).toHaveProperty("val0");
    expect(String(result?.val0)).toBe("255");
  });
});

describe("expandObjFormValues", () => {
  test("type-specific fields are expanded from packed values", () => {
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

  test("undefined typeSpec returns values unchanged", () => {
    const values = { type: 999, val0: 42, val1: 0, val2: 0, val3: 0 };
    const original = { ...values };

    const { expandedValues } = expandObjFormValues(values, original, undefined);

    expect(expandedValues).toEqual(values);
  });

  test("original and current values are expanded independently", () => {
    const typeSpec = requireSpec(5); // Weapon
    // current: curSharp=200 (bits 0-7), maxSharp=100 (bits 8-15)
    const values = {
      type: 5,
      val0: 200 | (100 << 8),
      val1: 0,
      val2: 0,
      val3: 0,
    };
    // original: curSharp=50 (bits 0-7), maxSharp=80 (bits 8-15)
    const original = {
      type: 5,
      val0: 50 | (80 << 8),
      val1: 0,
      val2: 0,
      val3: 0,
    };

    const { expandedOriginal, expandedValues } = expandObjFormValues(
      values,
      original,
      typeSpec,
    );

    expect(expandedValues).toHaveProperty("curSharp", 200);
    expect(expandedValues).toHaveProperty("maxSharp", 100);
    expect(expandedOriginal).toHaveProperty("curSharp", 50);
    expect(expandedOriginal).toHaveProperty("maxSharp", 80);
  });

  test("type with no spec returns both values unchanged", () => {
    // Undefined type (0) has an empty fields array - no expansion
    const typeSpec = requireSpec(0);
    const values = { type: 0, val0: 42, val1: 0, val2: 0, val3: 0 };
    const original = { type: 0, val0: 7, val1: 0, val2: 0, val3: 0 };

    const { expandedOriginal, expandedValues } = expandObjFormValues(
      values,
      original,
      typeSpec,
    );

    expect(expandedValues).toEqual(values);
    expect(expandedOriginal).toEqual(original);
  });

  test("expanded values preserve raw val keys alongside named fields", () => {
    const typeSpec = requireSpec(5); // Weapon
    const values = {
      type: 5,
      val0: 200 | (100 << 8),
      val1: 50 | (30 << 8),
      val2: 0,
      val3: 0,
    };
    const original = { ...values };

    const { expandedValues } = expandObjFormValues(values, original, typeSpec);

    // Named fields are present
    expect(expandedValues).toHaveProperty("curSharp", 200);
    expect(expandedValues).toHaveProperty("maxSharp", 100);
    // Raw val keys are also preserved (form rendering depends on both)
    expect(expandedValues).toHaveProperty("val0", 200 | (100 << 8));
    expect(expandedValues).toHaveProperty("val1", 50 | (30 << 8));
    expect(expandedValues).toHaveProperty("val2", 0);
    expect(expandedValues).toHaveProperty("val3", 0);
  });
});
