import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { diffEdits } from "@/lib/diff-edits.ts";
import { canonicalOwner, entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";
import { useAuthStore } from "@/state/auth.ts";

export function useMobEditor(vnumParam: string, owner: number | undefined) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const cOwner = canonicalOwner(owner, user?.playerId ?? 0);
  const powers = user?.powers ?? [];
  const isSenior = user?.isSenior ?? false;
  const permissions = resolvePermissions(powers, isSenior);
  const readOnly = !permissions.canEditMobs;

  const {
    data: entity,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () =>
      apiFetch(`/api/mobs/${vnum}${ownerSuffix(cOwner)}`, mobSchema),
    queryKey: entityKeys.detail("mob", vnum, cOwner),
  });

  const [edits, setEdits] = useState<null | Partial<Mob>>(null);
  const [extraEdits, setExtraEdits] = useState<MobExtra[] | null>(null);
  const [immEdits, setImmEdits] = useState<MobImm[] | null>(null);

  const dirty = edits !== null || extraEdits !== null || immEdits !== null;

  function resetEdits() {
    setEdits(null);
    setExtraEdits(null);
    setImmEdits(null);
  }

  async function saveFn() {
    if (!entity) return null;
    const body: Mob = {
      ...entity,
      ...edits,
      extras: extraEdits ?? entity.extras,
      immunities: immEdits ?? entity.immunities,
    };
    return apiFetch(`/api/mobs/${vnum}${ownerSuffix(cOwner)}`, mobSchema, {
      body: JSON.stringify(body),
      method: "PUT",
    });
  }

  function validate() {
    if (!entity) return null;
    const merged = { ...entity, ...edits };
    const requiredFields = [
      { key: "name" as const, label: "Keywords" },
      { key: "short_desc" as const, label: "Short Description" },
      { key: "long_desc" as const, label: "Long Description" },
      { key: "description" as const, label: "Detailed Description" },
    ];
    const errors = requiredFields
      .filter(({ key }) => !merged[key].trim())
      .map(({ key, label }) => ({
        field: key,
        message: `${label} is required`,
      }));
    return errors.length > 0 ? errors : null;
  }

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
    allKey: entityKeys.all("mob"),
    data: entity,
    deletePath: `/api/mobs/${vnum}${ownerSuffix(cOwner)}`,
    detailKey: entityKeys.detail("mob", vnum, cOwner),
    dirty,
    listPath: "/mobs",
    onReset: resetEdits,
    readOnly,
    saveFn,
    validate,
  });

  const currentValues = entity ? mobToFormValues(entity, edits) : {};
  const originalValues = entity ? mobToFormValues(entity, null) : {};

  function handleFieldChange(key: string, value: number | string) {
    if (!entity) return;
    clearFieldError(key);
    setEdits((prev) => diffEdits({ ...prev, [key]: value }, entity));
  }

  return {
    cOwner,
    currentValues,
    deletePending,
    dirty,
    entity,
    error,
    extraEdits,
    fieldErrors,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
    immEdits,
    isError,
    isLoading,
    originalValues,
    owner,
    permissions,
    powers,
    readOnly,
    resetEdits,
    saving,
    setExtraEdits,
    setImmEdits,
    type: "mob" as const,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  };
}

function mobToFormValues(
  mob: Mob,
  edits: null | Partial<Mob>,
): Record<string, number | string> {
  const { extras: _e, immunities: _i, ...fields } = mob;
  if (!edits) {
    return fields;
  }
  const { extras: _ee, immunities: _ei, ...editFields } = edits;
  return { ...fields, ...editFields };
}
