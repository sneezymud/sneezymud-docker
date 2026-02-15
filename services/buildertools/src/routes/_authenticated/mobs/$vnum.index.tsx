import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import {
  CLASS_TYPES,
  MOB_ACTIONS,
  MOB_AFFECTS,
  POSITION_TYPES,
  RACE_TYPES,
  SEX_TYPES,
} from "@/shared/enums/index.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/")({
  component: MobEditorPage,
});

const mobFieldGroups: FieldGroupDef[] = [
  {
    fields: [
      { key: "name", label: "Keywords", type: "text" },
      { key: "short_desc", label: "Short Description", type: "text" },
      { key: "long_desc", label: "Long Description", type: "text" },
      { key: "description", label: "Detailed Description", type: "textarea" },
    ],
    title: "Identity",
  },
  {
    fields: [
      { key: "level", label: "Level", type: "number" },
      { key: "attacks", label: "Attacks", type: "number" },
      { key: "tohit", label: "To-Hit", type: "number" },
      {
        help: "Armor class (lower = better)",
        key: "ac",
        label: "AC",
        type: "number",
      },
      { key: "hpbonus", label: "HP Bonus", type: "number" },
      { key: "damage_level", label: "Damage Level", type: "number" },
      { key: "damage_precision", label: "Damage Precision", type: "number" },
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
    title: "Attributes",
  },
  {
    fields: [
      { enumEntries: RACE_TYPES, key: "race", label: "Race", type: "enum" },
      { enumEntries: CLASS_TYPES, key: "class", label: "Class", type: "enum" },
      { enumEntries: SEX_TYPES, key: "sex", label: "Sex", type: "enum" },
      { key: "weight", label: "Weight", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { key: "skin", label: "Skin", type: "number" },
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
      { key: "faction", label: "Faction", type: "number" },
      { key: "fact_perc", label: "Faction %", type: "number" },
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
      { key: "letter", label: "Letter", type: "text" },
    ],
    title: "Behavior",
  },
  {
    fields: [
      { key: "gold", label: "Gold", type: "number" },
      { key: "max_exist", label: "Max Exist", type: "number" },
      { key: "can_be_seen", label: "Can Be Seen", type: "number" },
      { key: "vision", label: "Vision", type: "number" },
      { key: "spec_proc", label: "Special Proc", type: "number" },
    ],
    title: "Economy & Limits",
  },
  {
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

function MobEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
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

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!mob) {
        return;
      }
      const body: Mob = {
        ...mob,
        ...edits,
        extras: extraEdits ?? mob.extras,
        immunities: immEdits ?? mob.immunities,
      };
      await apiFetch(`/api/mobs/${String(vnum)}`, mobSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async () => {
      setEdits(null);
      setExtraEdits(null);
      setImmEdits(null);
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["mob", vnum] });
      await queryClient.invalidateQueries({ queryKey: ["mobs"] });
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
      toast.error(
        err instanceof ApiResponseError ? err.message : "Failed to delete",
      );
    },
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["mobs"] });
      await navigate({ to: "/mobs" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty);

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
      <div className="mb-4 flex items-center gap-3">
        <button
          className="text-sm text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            void navigate({ to: "/mobs" });
          }}
          type="button"
        >
          &larr; Mobs
        </button>
        <h2 className="text-lg font-semibold text-zinc-100">
          Mob {vnum}: {mob.short_desc || "(unnamed)"}
        </h2>
        <button
          className="ml-auto rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
          onClick={() => {
            void navigate({
              params: { vnum: vnumParam },
              to: "/mobs/$vnum/responses",
            });
          }}
          type="button"
        >
          Edit Responses
        </button>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete mob ${String(vnum)}? This also removes extras, immunities, and responses.`}
        dirty={dirty}
        groups={mobFieldGroups}
        onChange={handleFieldChange}
        onDelete={() => {
          deleteMutation.mutate();
        }}
        onSave={handleSave}
        saving={saveMutation.isPending}
        values={currentValues}
      >
        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", keyword: "", vnum }}
          label="Extra Descriptions"
          onChange={setExtraEdits}
          rows={extraEdits ?? mob.extras}
        />
        <SubTable
          columns={immColumns}
          emptyRow={{ amt: 0, type: 0, vnum }}
          label="Immunities"
          onChange={setImmEdits}
          rows={immEdits ?? mob.immunities}
        />
      </EntityForm>
    </div>
  );
}
