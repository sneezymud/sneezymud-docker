import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { diffEdits } from "@/lib/diff-edits.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { mobKeys } from "@/shared/query-keys.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";
import { useAuthStore } from "@/state/auth.ts";

export function useMobEditor(vnumParam: string) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const powers = user?.powers ?? [];

  const {
    data: mob,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${vnum}`, mobSchema),
    queryKey: mobKeys.detail(vnum),
  });

  const { data: mobResponse } = useQuery({
    queryFn: () => apiFetch(`/api/mob-responses/${vnum}`, mobResponseSchema),
    queryKey: ["mob-responses", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Mob>>(null);
  const [extraEdits, setExtraEdits] = useState<MobExtra[] | null>(null);
  const [immEdits, setImmEdits] = useState<MobImm[] | null>(null);

  const dirty = edits !== null || extraEdits !== null || immEdits !== null;

  const resetEdits = () => {
    setEdits(null);
    setExtraEdits(null);
    setImmEdits(null);
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
    allKey: mobKeys.all,
    data: mob,
    deletePath: `/api/mobs/${vnum}`,
    detailKey: mobKeys.detail(vnum),
    dirty,
    listPath: "/mobs",
    onReset: resetEdits,
    saveFn: async () => {
      if (!mob) return null;
      const body: Mob = {
        ...mob,
        ...edits,
        extras: extraEdits ?? mob.extras,
        immunities: immEdits ?? mob.immunities,
      };
      return apiFetch(`/api/mobs/${vnum}`, mobSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    validate: () => {
      if (!mob) return null;
      const merged = { ...mob, ...edits };
      const requiredFields = [
        { key: "name" as const, label: "Keywords" },
        { key: "short_desc" as const, label: "Short Description" },
        { key: "long_desc" as const, label: "Long Description" },
        { key: "description" as const, label: "Detailed Description" },
      ];
      const missing = requiredFields
        .filter((f) => !merged[f.key].trim())
        .map((f) => f.label);
      if (missing.length > 0) {
        return `Required fields cannot be empty: ${missing.join(", ")}`;
      }
      return null;
    },
  });

  const currentValues = mob ? mobToFormValues(mob, edits) : {};
  const originalValues = mob ? mobToFormValues(mob, null) : {};

  const handleFieldChange = (key: string, value: number | string) => {
    if (!mob) return;
    setEdits((prev) => diffEdits({ ...prev, [key]: value }, mob));
  };

  return {
    currentValues,
    deletePending,
    dirty,
    error,
    extraEdits,
    handleDelete,
    handleFieldChange,
    handleSave,
    immEdits,
    isError,
    isLoading,
    mob,
    mobResponse,
    originalValues,
    powers,
    resetEdits,
    saving,
    setExtraEdits,
    setImmEdits,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
    vnumParam,
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
