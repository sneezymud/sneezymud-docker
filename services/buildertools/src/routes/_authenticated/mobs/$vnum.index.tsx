import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useBlocker,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useConcurrentEditWarning } from "@/hooks/use-concurrent-edit-warning.ts";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { useSyncDirty } from "@/hooks/use-sync-dirty.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import {
  CLASS_TYPES,
  FACTION_TYPES,
  MOB_ACTIONS,
  MOB_AFFECTS,
  MOB_SPEC_PROCS,
  POSITION_TYPES,
  RACE_TYPES,
  SEX_TYPES,
  VISION_TYPES,
} from "@/shared/enums/index.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";
import { toastError } from "@/shared/toast.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/")({
  component: MobEditorPage,
});

const mobFieldGroups: FieldGroupDef[] = [
  {
    fields: [
      { key: "name", label: "Keywords", required: true, type: "text" },
      {
        key: "short_desc",
        label: "Short Description",
        required: true,
        type: "text",
      },
      { key: "long_desc", label: "Long Description", type: "text" },
      { key: "description", label: "Detailed Description", type: "textarea" },
    ],
    title: "Identity",
  },
  {
    fields: [
      { key: "level", label: "Level", required: true, type: "number" },
      {
        help: "Number of attacks per round",
        key: "attacks",
        label: "Attacks",
        type: "number",
      },
      { key: "tohit", label: "To-Hit", type: "number" },
      {
        help: "Armor class (lower = better)",
        key: "ac",
        label: "AC",
        type: "number",
      },
      {
        help: "Bonus HP added to level-based calculation",
        key: "hpbonus",
        label: "HP Bonus",
        type: "number",
      },
      {
        help: "Base damage amount for melee attacks",
        key: "damage_level",
        label: "Damage Level",
        type: "number",
      },
      {
        help: "Variance in damage rolls",
        key: "damage_precision",
        label: "Damage Precision",
        type: "number",
      },
    ],
    title: "Combat",
  },
  {
    fields: [
      { key: "str", label: "Strength", type: "number" },
      { key: "bra", label: "Bravery", type: "number" },
      { key: "con", label: "Constitution", type: "number" },
      { key: "dex", label: "Dexterity", type: "number" },
      { key: "agi", label: "Agility", type: "number" },
      { key: "intel", label: "Intelligence", type: "number" },
      { key: "wis", label: "Wisdom", type: "number" },
      { key: "foc", label: "Focus", type: "number" },
      { key: "per", label: "Perception", type: "number" },
      { key: "cha", label: "Charisma", type: "number" },
      { key: "kar", label: "Karma", type: "number" },
      { key: "spe", label: "Speed", type: "number" },
    ],
    labelClass: "tracking-wide",
    title: "Attributes",
  },
  {
    fields: [
      { enumEntries: RACE_TYPES, key: "race", label: "Race", type: "enum" },
      { enumEntries: CLASS_TYPES, key: "class", label: "Class", type: "enum" },
      { enumEntries: SEX_TYPES, key: "sex", label: "Sex", type: "enum" },
      { key: "weight", label: "Weight", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { enumEntries: RACE_TYPES, key: "skin", label: "Skin", type: "enum" },
    ],
    title: "Physical",
  },
  {
    fields: [
      {
        bitfieldEntries: MOB_ACTIONS,
        key: "actions",
        label: "Action Flags",
        type: "bitfield",
      },
      {
        bitfieldEntries: MOB_AFFECTS,
        key: "affects",
        label: "Affect Flags",
        type: "bitfield",
      },
      {
        enumEntries: FACTION_TYPES,
        help: "Faction group ID",
        key: "faction",
        label: "Faction",
        type: "enum",
      },
      {
        help: "Faction standing adjustment on kill",
        key: "fact_perc",
        label: "Faction %",
        type: "number",
      },
      {
        enumEntries: POSITION_TYPES,
        key: "pos",
        label: "Position",
        type: "enum",
      },
      {
        enumEntries: POSITION_TYPES,
        key: "def_position",
        label: "Default Position",
        type: "enum",
      },
      {
        help: "Map display character",
        key: "letter",
        label: "Letter",
        type: "text",
      },
    ],
    title: "Behavior",
  },
  {
    fields: [
      { key: "gold", label: "Gold", type: "number" },
      {
        help: "Max instances in the world (0 = unlimited)",
        key: "max_exist",
        label: "Max Exist",
        type: "number",
      },
      {
        help: "Minimum perception to notice this mob",
        key: "can_be_seen",
        label: "Can Be Seen",
        type: "number",
      },
      {
        enumEntries: VISION_TYPES,
        help: "Mob\u2019s visual range in rooms",
        key: "vision",
        label: "Vision",
        type: "enum",
      },
      {
        enumEntries: MOB_SPEC_PROCS,
        help: "Special procedure ID (0 = none)",
        key: "spec_proc",
        label: "Special Proc",
        type: "enum",
      },
    ],
    title: "Economy & Limits",
  },
  {
    collapsible: true,
    defaultCollapsed: true,
    fields: [
      { key: "local_sound", label: "Local Sound", type: "text" },
      { key: "adjacent_sound", label: "Adjacent Sound", type: "text" },
    ],
    title: "Sounds",
  },
];

const extraColumns: Array<ColumnDef<MobExtra>> = [
  { key: "keyword", label: "Keyword", type: "text", width: "200px" },
  { key: "description", label: "Description", type: "text", width: "1fr" },
];

const immColumns: Array<ColumnDef<MobImm>> = [
  { key: "type", label: "Immunity Type", type: "number", width: "140px" },
  { key: "amt", label: "Amount", type: "number", width: "140px" },
];

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

function MobEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: mob,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${String(vnum)}`, mobSchema),
    queryKey: ["mob", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Mob>>(null);
  const [extraEdits, setExtraEdits] = useState<MobExtra[] | null>(null);
  const [immEdits, setImmEdits] = useState<MobImm[] | null>(null);

  const dirty = edits !== null || extraEdits !== null || immEdits !== null;
  useSyncDirty(dirty);
  useConcurrentEditWarning(mob, dirty);

  const { proceed, reset, status } = useBlocker({
    enableBeforeUnload: true,
    shouldBlockFn: () => dirty,
    withResolver: true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mob) {
        return null;
      }
      const body: Mob = {
        ...mob,
        ...edits,
        extras: extraEdits ?? mob.extras,
        immunities: immEdits ?? mob.immunities,
      };
      return apiFetch(`/api/mobs/${String(vnum)}`, mobSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async (saved) => {
      toast.success("Saved");
      if (saved) {
        queryClient.setQueryData(["mob", vnum], saved);
      }
      setEdits(null);
      setExtraEdits(null);
      setImmEdits(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mob", vnum] }),
        queryClient.invalidateQueries({ queryKey: ["mobs"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(
        `/api/mobs/${String(vnum)}`,
        z.object({ ok: z.boolean() }),
        { method: "DELETE" },
      );
    },
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to delete",
      );
    },
    onSuccess: async () => {
      toast.success("Deleted");
      void queryClient.invalidateQueries({ queryKey: ["mobs"] });
      await navigate({ to: "/mobs" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty && !saveMutation.isPending);

  if (isLoading || isError || !mob) {
    return (
      <QueryStatus
        backLabel="Mobs"
        backTo="/mobs"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`mob ${String(vnum)}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  const currentValues = mobToFormValues(mob, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-4 space-y-1">
        <div className="flex items-center justify-between">
          <Breadcrumbs
            items={[
              { label: "Mobs", to: "/mobs" },
              {
                label: `Mob ${String(vnum)}: ${mob.short_desc || "(unnamed)"}`,
              },
            ]}
          />
          <Link
            className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            params={{ vnum: vnumParam }}
            to="/mobs/$vnum/responses"
          >
            Edit Responses
          </Link>
        </div>
        <h2 className="text-xl font-bold text-zinc-100">
          Mob {vnum}: {mob.short_desc || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete mob ${String(vnum)}? This also removes extras, immunities, and responses.`}
        deletePending={deleteMutation.isPending}
        dirty={dirty}
        groups={mobFieldGroups}
        onChange={handleFieldChange}
        onDelete={() => {
          deleteMutation.mutate();
        }}
        onReset={() => {
          setEdits(null);
          setExtraEdits(null);
          setImmEdits(null);
        }}
        onSave={handleSave}
        originalValues={mobToFormValues(mob, null)}
        saving={saveMutation.isPending}
        values={currentValues}
      >
        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", keyword: "", vnum }}
          label="Extra Descriptions"
          onChange={setExtraEdits}
          rows={extraEdits ?? mob.extras}
          singularLabel="extra description"
        />
        <SubTable
          columns={immColumns}
          emptyRow={{ amt: 0, type: 0, vnum }}
          label="Immunities"
          onChange={setImmEdits}
          rows={immEdits ?? mob.immunities}
          singularLabel="immunity"
        />
      </EntityForm>

      <ConfirmDialog
        confirmLabel="Discard changes"
        message="You have unsaved changes that will be lost."
        onCancel={() => {
          reset?.();
        }}
        onConfirm={() => {
          proceed?.();
        }}
        open={status === "blocked"}
        title="Unsaved Changes"
        variant="danger"
      />
    </div>
  );
}

function MobEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <MobEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
