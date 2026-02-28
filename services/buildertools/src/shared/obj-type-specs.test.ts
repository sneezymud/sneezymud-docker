import { describe, expect, test } from "bun:test";

import {
  expandTypeValues,
  getBits,
  getObjTypeSpec,
  setBits,
} from "./obj-type-specs.ts";

// Helper: get spec or fail the test
function requireSpec(itemType: number) {
  const spec = getObjTypeSpec(itemType);
  expect(spec).toBeDefined();
  // After the expect, spec is known to be defined at runtime
  return spec ?? { fields: [] };
}

// ---- getBits ----

describe("getBits", () => {
  test("extracts low byte (bits 0-7)", () => {
    // 0x64C8 = weapon val0 with curSharp=200, maxSharp=100
    expect(getBits(0x64_c8, 7, 8)).toBe(200);
  });

  test("extracts second byte (bits 8-15)", () => {
    expect(getBits(0x64_c8, 15, 8)).toBe(100);
  });

  test("extracts 16-bit field (bits 0-15)", () => {
    // Container val1: flags=5 in bits 0-15, trapType=3 in bits 16-23, trapDam=10 in bits 24-31
    const packed = 5 | (3 << 16) | (10 << 24);
    expect(getBits(packed, 15, 16)).toBe(5);
  });

  test("extracts byte from bits 16-23", () => {
    const packed = 5 | (3 << 16) | (10 << 24);
    expect(getBits(packed, 23, 8)).toBe(3);
  });

  test("extracts byte from bits 24-31", () => {
    const packed = 5 | (3 << 16) | (10 << 24);
    expect(getBits(packed, 31, 8)).toBe(10);
  });

  test("extracts single bit 31 (TEgg eggTouched)", () => {
    // Egg val0: fillHours=15 in bits 0-30, eggTouched=1 in bit 31
    const packed = 15 | (1 << 31); // -2147483633 as signed
    expect(getBits(packed, 31, 1)).toBe(1);
  });

  test("extracts 31-bit field (bits 0-30)", () => {
    const packed = 15 | (1 << 31);
    expect(getBits(packed, 30, 31)).toBe(15);
  });

  test("extracts zero from cleared bits", () => {
    expect(getBits(0xff_00, 7, 8)).toBe(0);
  });

  test("extracts zero from bit 31 when unset", () => {
    expect(getBits(0x7f_ff_ff_ff, 31, 1)).toBe(0);
  });
});

// ---- setBits ----

describe("setBits", () => {
  test("sets low byte preserving high byte", () => {
    // Change curSharp from 200 to 150, keep maxSharp=100
    const original = 0x64_c8; // curSharp=200, maxSharp=100
    const result = setBits(original, 7, 8, 150);
    expect(getBits(result, 7, 8)).toBe(150);
    expect(getBits(result, 15, 8)).toBe(100);
  });

  test("sets high byte preserving low byte", () => {
    const original = 0x64_c8;
    const result = setBits(original, 15, 8, 50);
    expect(getBits(result, 7, 8)).toBe(200);
    expect(getBits(result, 15, 8)).toBe(50);
  });

  test("sets bit 31 preserving lower bits", () => {
    const result = setBits(15, 31, 1, 1);
    expect(getBits(result, 30, 31)).toBe(15);
    expect(getBits(result, 31, 1)).toBe(1);
  });

  test("clears bit 31 preserving lower bits", () => {
    const packed = 15 | (1 << 31);
    const result = setBits(packed, 31, 1, 0);
    expect(result).toBe(15);
  });

  test("sets middle byte in 4-byte value", () => {
    // Container val1: set trapType (bits 16-23) to 7, keep flags=5 and trapDam=10
    const original = 5 | (3 << 16) | (10 << 24);
    const result = setBits(original, 23, 8, 7);
    expect(getBits(result, 15, 16)).toBe(5);
    expect(getBits(result, 23, 8)).toBe(7);
    expect(getBits(result, 31, 8)).toBe(10);
  });

  test("round-trips through getBits", () => {
    // Arbitrary 4-field packed value
    const val = (42 << 24) | (7 << 16) | (200 << 8) | 15;
    expect(getBits(val, 7, 8)).toBe(15);
    expect(getBits(val, 15, 8)).toBe(200);
    expect(getBits(val, 23, 8)).toBe(7);
    expect(getBits(val, 31, 8)).toBe(42);

    // Modify one field, verify others unchanged
    const modified = setBits(val, 15, 8, 99);
    expect(getBits(modified, 7, 8)).toBe(15);
    expect(getBits(modified, 15, 8)).toBe(99);
    expect(getBits(modified, 23, 8)).toBe(7);
    expect(getBits(modified, 31, 8)).toBe(42);
  });
});

// ---- getObjTypeSpec ----

describe("getObjTypeSpec", () => {
  test("returns empty fields for no-value type (Undefined = 0)", () => {
    const spec = requireSpec(0);
    expect(spec.fields).toEqual([]);
  });

  test("returns spec with fields for Weapon (5)", () => {
    const spec = requireSpec(5);
    expect(spec.fields.length).toBe(10);
  });

  test("returns undefined for unknown type (> 76)", () => {
    expect(getObjTypeSpec(100)).toBeUndefined();
    expect(getObjTypeSpec(77)).toBeUndefined();
  });

  test("all field keys are unique within each spec", () => {
    for (let type = 0; type <= 76; type++) {
      const spec = getObjTypeSpec(type);
      if (!spec || spec.fields.length === 0) continue;
      const keys = spec.fields.map((f) => f.key);
      const unique = new Set(keys);
      expect(unique.size).toBe(keys.length);
    }
  });
});

// ---- expandTypeValues ----

describe("expandTypeValues", () => {
  test("expands simple (non-bit-packed) type - Light (1)", () => {
    const spec = requireSpec(1);
    const result = expandTypeValues(spec, [5, 100, 80, 0]);
    expect(result).toEqual({
      curBurn: 80,
      isLit: 0,
      lightAmt: 5,
      maxBurn: 100,
    });
  });

  test("expands bit-packed type - Weapon (5)", () => {
    const spec = requireSpec(5);
    // val0: curSharp=200, maxSharp=100
    // val1: damLvl=50, damDev=30
    // val2: weapType0=1, weapFreq0=2, weapType1=3, weapFreq1=4
    // val3: weapType2=5, weapFreq2=6
    const val0 = 200 | (100 << 8);
    const val1 = 50 | (30 << 8);
    const val2 = 1 | (2 << 8) | (3 << 16) | (4 << 24);
    const val3 = 5 | (6 << 8);
    const result = expandTypeValues(spec, [val0, val1, val2, val3]);
    expect(result).toMatchObject({
      curSharp: 200,
      damDev: 30,
      damLvl: 50,
      maxSharp: 100,
      weapFreq0: 2,
      weapFreq1: 4,
      weapFreq2: 6,
      weapType0: 1,
      weapType1: 3,
      weapType2: 5,
    });
  });

  test("expands Egg (65) with bit 31 flag", () => {
    const spec = requireSpec(65);
    // val0: fillHours=15 in bits 0-30, eggTouched=1 in bit 31
    const val0 = 15 | (1 << 31);
    const result = expandTypeValues(spec, [val0, 200, 1234, 0]);
    expect(result).toMatchObject({
      eggTimer: 200,
      eggTouched: 1,
      fillHours: 15,
      hatchMobVnum: 1234,
    });
  });

  test("expands Container (15) with 3-field bit-packed val1", () => {
    const spec = requireSpec(15);
    // val0: maxWeight=500
    // val1: flags=5 | trapType=3<<16 | trapDam=10<<24
    // val2: keyVnum=1001
    // val3: maxVolume=3000
    const val1 = 5 | (3 << 16) | (10 << 24);
    const result = expandTypeValues(spec, [500, val1, 1001, 3000]);
    expect(result).toMatchObject({
      containerFlags: 5,
      keyVnum: 1001,
      maxVolume: 3000,
      maxWeight: 500,
      trapDam: 10,
      trapType: 3,
    });
  });

  test("returns empty object for no-value type", () => {
    const spec = requireSpec(0);
    const result = expandTypeValues(spec, [999, 888, 777, 666]);
    expect(result).toEqual({});
  });
});
