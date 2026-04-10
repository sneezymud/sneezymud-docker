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
  test("can extract an 8-bit field from a packed value", () => {
    // 0x64C8 = weapon val0 with curSharp=200, maxSharp=100
    expect(getBits(0x64_c8, 7, 8)).toBe(200);
  });

  test("can extract the second byte from a packed value", () => {
    expect(getBits(0x64_c8, 15, 8)).toBe(100);
  });

  test("can extract a 16-bit field from a packed value", () => {
    // Container val1: flags=5 in bits 0-15, trapType=3 in bits 16-23, trapDam=10 in bits 24-31
    const packed = 5 | (3 << 16) | (10 << 24);
    expect(getBits(packed, 15, 16)).toBe(5);
  });

  test("can extract a byte from the third position", () => {
    const packed = 5 | (3 << 16) | (10 << 24);
    expect(getBits(packed, 23, 8)).toBe(3);
  });

  test("can extract a byte from the fourth position", () => {
    const packed = 5 | (3 << 16) | (10 << 24);
    expect(getBits(packed, 31, 8)).toBe(10);
  });

  test("can extract a single bit at position 31", () => {
    // Egg val0: fillHours=15 in bits 0-30, eggTouched=1 in bit 31
    const packed = 15 | (1 << 31); // -2147483633 as signed
    expect(getBits(packed, 31, 1)).toBe(1);
  });

  test("can extract a 31-bit field", () => {
    const packed = 15 | (1 << 31);
    expect(getBits(packed, 30, 31)).toBe(15);
  });

  test("returns zero for cleared bit ranges", () => {
    expect(getBits(0xff_00, 7, 8)).toBe(0);
  });

  test("returns zero for unset bit 31", () => {
    expect(getBits(0x7f_ff_ff_ff, 31, 1)).toBe(0);
  });
});

// ---- setBits ----

describe("setBits", () => {
  test("setting low byte preserves high byte", () => {
    // Change curSharp from 200 to 150, keep maxSharp=100
    const original = 0x64_c8; // curSharp=200, maxSharp=100
    const result = setBits(original, 7, 8, 150);
    expect(getBits(result, 7, 8)).toBe(150);
    expect(getBits(result, 15, 8)).toBe(100);
  });

  test("setting high byte preserves low byte", () => {
    const original = 0x64_c8;
    const result = setBits(original, 15, 8, 50);
    expect(getBits(result, 7, 8)).toBe(200);
    expect(getBits(result, 15, 8)).toBe(50);
  });

  test("setting bit 31 preserves lower bits", () => {
    const result = setBits(15, 31, 1, 1);
    expect(getBits(result, 30, 31)).toBe(15);
    expect(getBits(result, 31, 1)).toBe(1);
  });

  test("clearing bit 31 preserves lower bits", () => {
    const packed = 15 | (1 << 31);
    const result = setBits(packed, 31, 1, 0);
    expect(result).toBe(15);
  });

  test("setting middle byte preserves surrounding bytes", () => {
    // Container val1: set trapType (bits 16-23) to 7, keep flags=5 and trapDam=10
    const original = 5 | (3 << 16) | (10 << 24);
    const result = setBits(original, 23, 8, 7);
    expect(getBits(result, 15, 16)).toBe(5);
    expect(getBits(result, 23, 8)).toBe(7);
    expect(getBits(result, 31, 8)).toBe(10);
  });

  test("modified field round-trips through getBits", () => {
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

  test("over-width values are silently truncated to the field width", () => {
    // 300 = 0b100101100 (9 bits) into an 8-bit field: truncated to 0b00101100 = 44
    const result = setBits(0, 7, 8, 300);
    const truncated = setBits(0, 7, 8, 300 & 0xff);
    expect(result).toBe(truncated);
    expect(getBits(result, 7, 8)).toBe(44);
  });
});

// ---- getObjTypeSpec ----

describe("getObjTypeSpec", () => {
  test("undefined type has no value fields", () => {
    const spec = requireSpec(0);
    expect(spec.fields).toEqual([]);
  });

  test("weapon type has the expected field definitions", () => {
    const spec = requireSpec(5);
    expect(spec.fields.length).toBeGreaterThan(0);
    const keys = spec.fields.map((f) => f.key);
    expect(keys).toContain("curSharp");
    expect(keys).toContain("maxSharp");
    expect(keys).toContain("damLvl");
  });

  test("no type has overlapping bit-packed fields", () => {
    const overlaps: string[] = [];
    for (let type = 0; type <= 76; type++) {
      const spec = getObjTypeSpec(type);
      if (!spec || spec.fields.length === 0) continue;

      // Group bit-packed fields by val slot
      const bySlot = new Map<
        number,
        Array<{ high: number; key: string; low: number }>
      >();
      for (const field of spec.fields) {
        if (
          field.source.highBit === undefined ||
          field.source.numBits === undefined
        )
          continue;
        const slot = field.source.val;
        const high = field.source.highBit;
        const low = high - field.source.numBits + 1;
        const arr = bySlot.get(slot) ?? [];
        if (!bySlot.has(slot)) bySlot.set(slot, arr);
        arr.push({ high, key: field.key, low });
      }

      for (const [slot, slotFields] of bySlot) {
        for (const a of slotFields) {
          for (const b of slotFields) {
            if (a === b || a.key >= b.key) continue; // avoid duplicates
            if (a.low <= b.high && b.low <= a.high) {
              overlaps.push(
                `Type ${type}, val${slot}: "${a.key}" [${a.low}-${a.high}] and "${b.key}" [${b.low}-${b.high}]`,
              );
            }
          }
        }
      }
    }
    expect(overlaps).toEqual([]);
  });

  test("highBit and numBits are always paired", () => {
    const mismatches: string[] = [];
    for (let type = 0; type <= 76; type++) {
      const spec = getObjTypeSpec(type);
      if (!spec || spec.fields.length === 0) continue;

      for (const field of spec.fields) {
        const hasHighBit = field.source.highBit !== undefined;
        const hasNumBits = field.source.numBits !== undefined;
        if (hasHighBit !== hasNumBits) {
          mismatches.push(
            `Type ${type}, field "${field.key}": highBit and numBits must both be present or both absent`,
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test("all fields reference valid val slots", () => {
    const violations: string[] = [];
    for (let type = 0; type <= 76; type++) {
      const spec = getObjTypeSpec(type);
      if (!spec || spec.fields.length === 0) continue;

      for (const field of spec.fields) {
        if (field.source.val < 0 || field.source.val > 3) {
          violations.push(
            `Type ${type}, field "${field.key}": val slot ${field.source.val} out of range [0-3]`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  test("unknown type returns undefined", () => {
    expect(getObjTypeSpec(100)).toBeUndefined();
    expect(getObjTypeSpec(77)).toBeUndefined();
  });

  test("all field keys are unique within each type", () => {
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
  test("light type expands to named fields", () => {
    const spec = requireSpec(1);
    const result = expandTypeValues(spec, [5, 100, 80, 0]);
    expect(result).toEqual({
      curBurn: 80,
      isLit: 0,
      lightAmt: 5,
      maxBurn: 100,
    });
  });

  test("weapon type expands packed values to named fields", () => {
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

  test("egg type expands bit 31 flag correctly", () => {
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

  test("container type expands multi-field packed val", () => {
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

  test("type with no fields expands to empty object", () => {
    const spec = requireSpec(0);
    const result = expandTypeValues(spec, [999, 888, 777, 666]);
    expect(result).toEqual({});
  });

  test("all-zero packed values expand to all-zero named fields", () => {
    // Weapon has bit-packed fields; all zeros should produce all-zero sub-fields
    const spec = requireSpec(5);
    const result = expandTypeValues(spec, [0, 0, 0, 0]);
    for (const field of spec.fields) {
      expect(result[field.key]).toBe(0);
    }
  });
});

// ---- Round-trip: expand and repack ----

// Helper: repack expanded values back into raw val0-val3.
// val is always 0-3 (validated by spec construction), so array accesses are safe.
function repack(
  spec: {
    fields: Array<{
      key: string;
      source: { highBit?: number; numBits?: number; val: 0 | 1 | 2 | 3 };
    }>;
  },
  expanded: Record<string, number>,
): [number, number, number, number] {
  const raw: [number, number, number, number] = [0, 0, 0, 0];
  for (const field of spec.fields) {
    const value = expanded[field.key] ?? 0;
    raw[field.source.val] =
      field.source.highBit !== undefined && field.source.numBits !== undefined
        ? setBits(
            raw[field.source.val],
            field.source.highBit,
            field.source.numBits,
            value,
          )
        : value;
  }
  return raw;
}

describe("round-trip: expand and repack", () => {
  test("weapon round-trip preserves all sub-fields", () => {
    const spec = requireSpec(5);
    const val0 = 200 | (100 << 8); // curSharp=200, maxSharp=100
    const val1 = 50 | (30 << 8); // damLvl=50, damDev=30
    const val2 = 1 | (2 << 8) | (3 << 16) | (4 << 24);
    const val3 = 5 | (6 << 8);
    const original: [number, number, number, number] = [val0, val1, val2, val3];

    const expanded = expandTypeValues(spec, original);
    const repacked = repack(spec, expanded);

    expect(repacked).toEqual(original);
  });

  test("container round-trip preserves packed val1", () => {
    const spec = requireSpec(15);
    const val1 = 5 | (3 << 16) | (10 << 24); // flags=5, trapType=3, trapDam=10
    const original: [number, number, number, number] = [500, val1, 1001, 3000];

    const expanded = expandTypeValues(spec, original);
    const repacked = repack(spec, expanded);

    expect(repacked).toEqual(original);
  });

  test("egg round-trip preserves bit 31", () => {
    const spec = requireSpec(65);
    const val0 = 15 | (1 << 31); // fillHours=15, eggTouched=1
    const original: [number, number, number, number] = [val0, 200, 1234, 0];

    const expanded = expandTypeValues(spec, original);
    const repacked = repack(spec, expanded);

    expect(repacked).toEqual(original);
  });

  test("all types round-trip at max field values", () => {
    for (let type = 0; type <= 76; type++) {
      const spec = getObjTypeSpec(type);
      if (!spec || spec.fields.length === 0) continue;

      // Build max-value raw vals: set each bit-packed field to its max
      const raw: [number, number, number, number] = [0, 0, 0, 0];
      for (const field of spec.fields) {
        const maxVal =
          field.source.highBit !== undefined &&
          field.source.numBits !== undefined
            ? (1 << field.source.numBits) - 1
            : 255; // arbitrary for whole-val fields
        raw[field.source.val] =
          field.source.highBit !== undefined &&
          field.source.numBits !== undefined
            ? setBits(
                raw[field.source.val],
                field.source.highBit,
                field.source.numBits,
                maxVal,
              )
            : maxVal;
      }

      const expanded = expandTypeValues(spec, raw);
      const repacked = repack(spec, expanded);

      expect(repacked).toEqual(raw);
    }
  });
});
