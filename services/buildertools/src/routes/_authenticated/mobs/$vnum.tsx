import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { EntityForm } from "@/components/entity-form.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum")({
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
      { key: "race", label: "Race", type: "number" },
      { key: "class", label: "Class", type: "number" },
      { key: "sex", label: "Sex", type: "number" },
      { key: "weight", label: "Weight", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { key: "skin", label: "Skin", type: "number" },
    ],
    title: "Physical",
  },
  {
    fields: [
      {
        help: "Bitfield for mob actions (sentinel, scavenger, etc.)",
        key: "actions",
        label: "Action Flags",
        type: "number",
      },
      {
        help: "Bitfield for affect flags",
        key: "affects",
        label: "Affect Flags",
        type: "number",
      },
      { key: "faction", label: "Faction", type: "number" },
      { key: "fact_perc", label: "Faction %", type: "number" },
      {
        help: "Standing position (8=standing, 9=fighting)",
        key: "pos",
        label: "Position",
        type: "number",
      },
      { key: "def_position", label: "Default Position", type: "number" },
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

  const { data: mob, isLoading } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${String(vnum)}`, mobSchema),
    queryKey: ["mob", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Mob>>(null);
  const [extraEdits, setExtraEdits] = useState<MobExtra[] | null>(null);
  const [immEdits, setImmEdits] = useState<MobImm[] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    onSuccess: async () => {
      setEdits(null);
      setExtraEdits(null);
      setImmEdits(null);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobs"] });
      await navigate({ to: "/mobs" });
    },
  });

  if (isLoading || !mob) {
    return <p className="text-sm text-zinc-500">Loading mob {vnum}...</p>;
  }

  const currentValues = mobToFormValues(mob, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
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
        dirty={dirty}
        groups={mobFieldGroups}
        onChange={handleFieldChange}
        onDelete={handleDelete}
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

      {showDeleteConfirm && !deleteMutation.isPending ? (
        <div className="mt-4 rounded border border-red-800/50 bg-red-900/10 p-4">
          <p className="mb-3 text-sm text-red-400">
            Are you sure you want to delete mob {vnum}? This also removes
            extras, immunities, and responses.
          </p>
          <div className="flex gap-2">
            <button
              className="rounded bg-red-800 px-3 py-1.5 text-sm text-red-100 hover:bg-red-700"
              onClick={() => {
                deleteMutation.mutate();
              }}
              type="button"
            >
              Yes, delete
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setShowDeleteConfirm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
