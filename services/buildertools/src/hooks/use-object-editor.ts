import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { diffEdits } from "@/lib/diff-edits.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { VAL_KEYS } from "@/shared/fields/obj-fields.tsx";
import {
  expandTypeValues,
  getObjTypeSpec,
  setBits,
} from "@/shared/obj-type-specs.ts";
import { objectKeys } from "@/shared/query-keys.ts";
import { objSchema } from "@/shared/schemas/obj.ts";
import { useAuthStore } from "@/state/auth.ts";

export function useObjectEditor(vnumParam: string) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const powers = user?.powers ?? [];

  const {
    data: obj,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/objects/${vnum}`, objSchema),
    queryKey: objectKeys.detail(vnum),
  });

  const [edits, setEdits] = useState<null | Partial<Obj>>(null);
  const [affectEdits, setAffectEdits] = useState<null | ObjAffect[]>(null);
  const [extraEdits, setExtraEdits] = useState<null | ObjExtra[]>(null);

  const dirty = edits !== null || affectEdits !== null || extraEdits !== null;

  const resetEdits = () => {
    setEdits(null);
    setAffectEdits(null);
    setExtraEdits(null);
  };

  const {
    deletePending,
    handleDelete,
    handleSave,
    saving,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
  } = useEntityEditor({
    allKey: objectKeys.all,
    data: obj,
    deletePath: `/api/objects/${vnum}`,
    detailKey: objectKeys.detail(vnum),
    dirty,
    listPath: "/objects",
    onReset: resetEdits,
    saveFn: async () => {
      if (!obj) return null;
      const body: Obj = {
        ...obj,
        ...edits,
        affects: affectEdits ?? obj.affects,
        extras: extraEdits ?? obj.extras,
      };
      return apiFetch(`/api/objects/${vnum}`, objSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
  });

  const currentValues = obj ? objToFormValues(obj, edits) : {};
  const currentItemType =
    typeof currentValues["type"] === "number" ? currentValues["type"] : 0;
  const typeSpec = getObjTypeSpec(currentItemType);

  const { expandedOriginal, expandedValues } = obj
    ? expandObjFormValues(currentValues, objToFormValues(obj, null), typeSpec)
    : { expandedOriginal: {}, expandedValues: {} };

  const handleFieldChange = (key: string, value: number | string) => {
    if (!obj) return;
    applyObjFieldChange(key, value, obj, typeSpec, setEdits);
  };

  return {
    affectEdits,
    currentItemType,
    deletePending,
    dirty,
    error,
    expandedOriginal,
    expandedValues,
    extraEdits,
    handleDelete,
    handleFieldChange,
    handleSave,
    isError,
    isLoading,
    obj,
    powers,
    resetEdits,
    saving,
    setAffectEdits,
    setExtraEdits,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  };
}

function objToFormValues(
  obj: Obj,
  edits: null | Partial<Obj>,
): Record<string, number | string> {
  const { affects: _a, extras: _e, ...fields } = obj;
  if (!edits) {
    return fields;
  }
  const { affects: _ea, extras: _ee, ...editFields } = edits;
  return { ...fields, ...editFields };
}

function expandObjFormValues(
  currentValues: Record<string, number | string>,
  originalValues: Record<string, number | string>,
  typeSpec: ReturnType<typeof getObjTypeSpec>,
) {
  const getRawVals = (
    vals: Record<string, number | string>,
  ): [number, number, number, number] => [
    Number(vals["val0"] ?? 0),
    Number(vals["val1"] ?? 0),
    Number(vals["val2"] ?? 0),
    Number(vals["val3"] ?? 0),
  ];

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

function applyObjFieldChange(
  key: string,
  value: number | string,
  obj: Obj,
  typeSpec: ReturnType<typeof getObjTypeSpec>,
  setEdits: React.Dispatch<React.SetStateAction<null | Partial<Obj>>>,
) {
  // Route spec field changes through bit-packing into raw val0-val3
  if (typeSpec) {
    const specField = typeSpec.fields.find((f) => f.key === key);
    if (specField) {
      const valKey = VAL_KEYS[specField.source.val];
      setEdits((prev) => {
        const currentRawVal = prev?.[valKey] ?? obj[valKey];
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
        return diffEdits({ ...prev, [valKey]: packed }, obj);
      });
      return;
    }
  }
  // When item type changes, clamp out-of-range type-specific values to
  // field minimums (e.g. switching to scroll when val0=0 would give
  // magicLevel=0 and learnedness=0, both below their min of 1)
  if (key === "type") {
    const numValue = typeof value === "number" ? value : Number(value);
    const newSpec = getObjTypeSpec(numValue);
    setEdits((prev) => {
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
          ...prev,
          type: numValue,
          val0: raw[0],
          val1: raw[1],
          val2: raw[2],
          val3: raw[3],
        },
        obj,
      );
    });
    return;
  }

  setEdits((prev) => diffEdits({ ...prev, [key]: value }, obj));
}
