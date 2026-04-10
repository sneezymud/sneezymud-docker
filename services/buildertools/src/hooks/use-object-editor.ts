import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { canonicalOwner, entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  applyObjFieldChange,
  expandObjFormValues,
} from "@/shared/obj-form-logic.ts";
import { getObjTypeSpec } from "@/shared/obj-type-specs.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { objSchema } from "@/shared/schemas/obj.ts";
import { useAuthStore } from "@/state/auth.ts";

export function useObjectEditor(vnumParam: string, owner: number | undefined) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const cOwner = canonicalOwner(owner, user?.playerId ?? 0);
  const powers = user?.powers ?? [];
  const isSenior = user?.isSenior ?? false;
  const permissions = resolvePermissions(powers, isSenior);
  const readOnly = !permissions.canEditObjects;

  const {
    data: obj,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () =>
      apiFetch(`/api/objects/${vnum}${ownerSuffix(cOwner)}`, objSchema),
    queryKey: entityKeys.detail("object", vnum, cOwner),
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
    allKey: entityKeys.all("object"),
    data: obj,
    deletePath: `/api/objects/${vnum}${ownerSuffix(cOwner)}`,
    detailKey: entityKeys.detail("object", vnum, cOwner),
    dirty,
    listPath: "/objects",
    onReset: resetEdits,
    readOnly,
    saveFn: async () => {
      if (!obj) return null;
      const body: Obj = {
        ...obj,
        ...edits,
        affects: affectEdits ?? obj.affects,
        extras: extraEdits ?? obj.extras,
      };
      return apiFetch(`/api/objects/${vnum}${ownerSuffix(cOwner)}`, objSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    validate: () => {
      if (!obj) return null;
      const merged = { ...obj, ...edits };
      const requiredFields = [
        { key: "name" as const, label: "Keywords" },
        { key: "short_desc" as const, label: "Short Description" },
        { key: "long_desc" as const, label: "Long Description" },
      ];
      const errors = requiredFields
        .filter((f) => !merged[f.key].trim())
        .map((f) => ({ field: f.key, message: `${f.label} is required` }));
      return errors.length > 0 ? errors : null;
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
    cOwner,
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
    isSenior,
    obj,
    permissions,
    powers,
    readOnly,
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
