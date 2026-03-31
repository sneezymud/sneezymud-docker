import type { Obj } from "@/shared/schemas/obj.ts";

import { diffEdits } from "@/lib/diff-edits.ts";
import { VAL_KEYS } from "@/shared/fields/obj-fields.tsx";
import {
  expandTypeValues,
  getObjTypeSpec,
  setBits,
} from "@/shared/obj-type-specs.ts";

/**
 * Expand type-specific field values from raw val0-val3 for both current
 * and original values. Returns the expanded records for form display.
 */
export function expandObjFormValues(
  currentValues: Record<string, number | string>,
  originalValues: Record<string, number | string>,
  typeSpec: ReturnType<typeof getObjTypeSpec>,
) {
  const hasFields = typeSpec && typeSpec.fields.length > 0;
  const expandedValues = hasFields
    ? {
        ...currentValues,
        ...expandTypeValues(typeSpec, getRawVals(currentValues)),
      }
    : currentValues;
  const expandedOriginal = hasFields
    ? {
        ...originalValues,
        ...expandTypeValues(typeSpec, getRawVals(originalValues)),
      }
    : originalValues;

  return { expandedOriginal, expandedValues };
}

/**
 * Pure version of the object field change handler. Returns the new edits
 * partial (via diffEdits) or null if no real change.
 *
 * Three branches:
 * 1. Spec field: pack value into correct val slot via setBits
 * 2. Type change: initialize val0-val3 with field minimums for the new type
 * 3. Regular field: simple diff
 */
export function applyObjFieldChange(
  key: string,
  value: number | string,
  obj: Obj,
  typeSpec: ReturnType<typeof getObjTypeSpec>,
  prevEdits: null | Partial<Obj>,
): null | Partial<Obj> {
  // Route spec field changes through bit-packing into raw val0-val3
  if (typeSpec) {
    const specField = typeSpec.fields.find((f) => f.key === key);
    if (specField) {
      const valKey = VAL_KEYS[specField.source.val];
      const currentRawVal = prevEdits?.[valKey] ?? obj[valKey];
      const numValue = typeof value === "number" ? value : Number(value);
      const packed =
        specField.source.highBit !== undefined &&
        specField.source.numBits !== undefined
          ? setBits(
              currentRawVal,
              specField.source.highBit,
              specField.source.numBits,
              numValue,
            )
          : numValue;
      return diffEdits({ ...prevEdits, [valKey]: packed }, obj);
    }
  }

  // When item type changes, clamp out-of-range type-specific values to
  // field minimums (e.g. switching to scroll when val0=0 would give
  // magicLevel=0 and learnedness=0, both below their min of 1)
  if (key === "type") {
    const numValue = typeof value === "number" ? value : Number(value);
    const newSpec = getObjTypeSpec(numValue);
    const raw: [number, number, number, number] = [0, 0, 0, 0];
    if (newSpec) {
      const expanded = expandTypeValues(newSpec, raw);
      for (const field of newSpec.fields) {
        if (field.input.type !== "number") continue;
        const { min } = field.input;
        if (min === undefined) continue;
        if ((expanded[field.key] ?? 0) < min) {
          raw[field.source.val] =
            field.source.highBit !== undefined &&
            field.source.numBits !== undefined
              ? setBits(
                  raw[field.source.val],
                  field.source.highBit,
                  field.source.numBits,
                  min,
                )
              : min;
        }
      }
    }
    return diffEdits(
      {
        ...prevEdits,
        type: numValue,
        val0: raw[0],
        val1: raw[1],
        val2: raw[2],
        val3: raw[3],
      },
      obj,
    );
  }

  // Regular (non-spec) field change
  return diffEdits({ ...prevEdits, [key]: value }, obj);
}

/** Extract raw val0-val3 from a flat values record. */
function getRawVals(
  vals: Record<string, number | string>,
): [number, number, number, number] {
  return [
    Number(vals["val0"] ?? 0),
    Number(vals["val1"] ?? 0),
    Number(vals["val2"] ?? 0),
    Number(vals["val3"] ?? 0),
  ];
}
