import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  applyObjFieldChange,
  expandObjFormValues,
} from "@/shared/obj-form-logic.ts";
import { getObjTypeSpec } from "@/shared/obj-type-specs.ts";
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
    clearFieldError,
    deletePending,
    fieldErrors,
    handleDelete,
    handleSave,
    handleSaveAndProceed,
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
    clearFieldError(key);
    setEdits((prev) => applyObjFieldChange(key, value, obj, typeSpec, prev));
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
    fieldErrors,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
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
