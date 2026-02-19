import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  CLASS_TYPES,
  FACTION_TYPES,
  IMMUNITY_TYPES,
  MATERIAL_TYPES,
  MOB_ACTIONS,
  MOB_AFFECTS,
  MOB_SPEC_PROCS,
  POSITION_TYPES,
  RACE_TYPES,
  SEX_TYPES,
  VISION_TYPES,
} from "@/shared/enums/index.ts";
import { mobKeys } from "@/shared/query-keys.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/")({
  component: MobEditorPage,
});

const mobFieldGroups: FieldGroupDef[] = [
  {
    fields: [
      {
        fullWidth: true,
        key: "name",
        label: "Keywords",
        required: true,
        type: "text",
      },
      {
        fullWidth: true,
        key: "short_desc",
        label: "Short Description",
        required: true,
        type: "text",
      },
      { key: "long_desc", label: "Long Description", type: "textarea" },
      { key: "description", label: "Detailed Description", type: "textarea" },
    ],
    title: "Identity",
  },
  {
    fields: [
      {
        help: "Mob level. Determines base HP, damage, and AC scaling.",
        key: "level",
        label: "Level",
        required: true,
        type: "number",
      },
      {
        help: "Number of attacks per round",
        key: "attacks",
        label: "Attacks",
        step: 0.1,
        type: "number",
      },
      {
        help: "Base attack roll bonus. Added to all melee attack rolls.",
        key: "tohit",
        label: "To-Hit",
        type: "number",
      },
      {
        help: "AC Level (0.0\u2013127.0). Higher = better defense. Actual AC = 600 \u2212 (20 \u00D7 AC Level).",
        key: "ac",
        label: "AC Level",
        step: 0.1,
        tooltip: (
          <>
            <p>
              <strong>AC Level</strong> is the value stored in the database. The
              game converts it to effective AC:
            </p>
            <p>
              <strong>
                {"Effective AC = 600 \u2212 (20 \u00D7 AC Level)"}
              </strong>
            </p>
            <p>Reference values:</p>
            <ul>
              <li>
                <strong>0</strong> {"\u2192"} AC 600 (no armor)
              </li>
              <li>
                <strong>10</strong> {"\u2192"} AC 400
              </li>
              <li>
                <strong>20</strong> {"\u2192"} AC 200
              </li>
              <li>
                <strong>30</strong> {"\u2192"} AC 0 (heavily armored)
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        help: "Bonus HP added to level-based calculation",
        key: "hpbonus",
        label: "HP Bonus",
        step: 0.1,
        type: "number",
      },
      {
        help: "Damage difficulty multiplier (0.0\u20132.0+). Scales base damage from level.",
        key: "damage_level",
        label: "Damage Level",
        step: 0.1,
        type: "number",
      },
      {
        help: "Attack precision (0\u2013100). Higher = more consistent damage.",
        key: "damage_precision",
        label: "Damage Precision",
        type: "number",
      },
    ],
    title: "Combat",
  },
  {
    fieldGroupSize: 3,
    fields: [
      { key: "str", label: "Strength", max: 25, min: -25, type: "number" },
      { key: "bra", label: "Brawn", max: 25, min: -25, type: "number" },
      { key: "con", label: "Constitution", max: 25, min: -25, type: "number" },
      { key: "dex", label: "Dexterity", max: 25, min: -25, type: "number" },
      { key: "agi", label: "Agility", max: 25, min: -25, type: "number" },
      { key: "spe", label: "Speed", max: 25, min: -25, type: "number" },
      {
        key: "intel",
        label: "Intelligence",
        max: 25,
        min: -25,
        type: "number",
      },
      { key: "wis", label: "Wisdom", max: 25, min: -25, type: "number" },
      { key: "foc", label: "Focus", max: 25, min: -25, type: "number" },
      { key: "per", label: "Perception", max: 25, min: -25, type: "number" },
      { key: "cha", label: "Charisma", max: 25, min: -25, type: "number" },
      { key: "kar", label: "Karma", max: 25, min: -25, type: "number" },
    ],
    gridCols: "grid-cols-1 sm:grid-cols-3",
    labelClass: "tracking-wide",
    title: "Attributes",
    tooltip: (
      <>
        <p>
          <strong>Signed offsets</strong> from the mob's racial base stats.
        </p>
        <ul>
          <li>
            <strong>0</strong> = racial average
          </li>
          <li>
            <strong>+25</strong> = maximum bonus
          </li>
          <li>
            <strong>{"\u221225"}</strong> = maximum penalty
          </li>
        </ul>
      </>
    ),
  },
  {
    fields: [
      { enumEntries: RACE_TYPES, key: "race", label: "Race", type: "enum" },
      { enumEntries: CLASS_TYPES, key: "class", label: "Class", type: "enum" },
      { enumEntries: SEX_TYPES, key: "sex", label: "Sex", type: "enum" },
      {
        help: "Body weight in pounds. 1\u2013100,000.",
        key: "weight",
        label: "Weight",
        tooltip: (
          <>
            <p>Reference weights:</p>
            <ul>
              <li>
                <strong>{"1\u201310"}</strong> {"\u2014"} tiny creatures (rats,
                birds)
              </li>
              <li>
                <strong>{"100\u2013200"}</strong> {"\u2014"} human-sized
              </li>
              <li>
                <strong>{"500\u20131,000"}</strong> {"\u2014"} horses, bears
              </li>
              <li>
                <strong>10,000+</strong> {"\u2014"} dragons, giants
              </li>
            </ul>
            <p>
              Affects bash/bodyslam effectiveness, encumbrance, and mount
              capacity.
            </p>
          </>
        ),
        type: "number",
      },
      {
        help: "Standing height in inches (not length). 1\u201310,000.",
        key: "height",
        label: "Height",
        tooltip: (
          <>
            <p>Reference heights (in inches):</p>
            <ul>
              <li>
                <strong>{"6\u201312"}</strong> {"\u2014"} small animals
              </li>
              <li>
                <strong>{"36\u201348"}</strong> {"\u2014"} hobbits, gnomes
              </li>
              <li>
                <strong>{"66\u201378"}</strong> {"\u2014"} human-sized
              </li>
              <li>
                <strong>{"96\u2013120"}</strong> {"\u2014"} ogres, giants
              </li>
            </ul>
            <p>
              Affects combat reach, hit location targeting, and mount
              compatibility.
            </p>
          </>
        ),
        type: "number",
      },
      {
        enumEntries: MATERIAL_TYPES,
        key: "skin",
        label: "Skin",
        type: "enum",
      },
    ],
    title: "Physical",
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
    fields: [
      { key: "local_sound", label: "Local Sound", type: "textarea" },
      { key: "adjacent_sound", label: "Adjacent Sound", type: "textarea" },
    ],
    title: "Sounds",
  },
  {
    colSpan: "full",
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
    gridCols: "grid-cols-2 lg:grid-cols-5",
    title: "Behavior",
  },
];

const extraColumns: Array<ColumnDef<MobExtra>> = [
  { key: "keyword", label: "Keywords", type: "tags", width: "1fr" },
  { key: "description", label: "Description", type: "textarea", width: "2fr" },
];

const immColumns: Array<ColumnDef<MobImm>> = [
  {
    entries: IMMUNITY_TYPES,
    key: "type",
    label: "Immunity Type",
    type: "enum",
    width: "200px",
  },
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

  const {
    data: mob,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${vnum}`, mobSchema),
    queryKey: mobKeys.detail(vnum),
  });

  const [edits, setEdits] = useState<null | Partial<Mob>>(null);
  const [extraEdits, setExtraEdits] = useState<MobExtra[] | null>(null);
  const [immEdits, setImmEdits] = useState<MobImm[] | null>(null);

  const dirty = edits !== null || extraEdits !== null || immEdits !== null;

  const {
    blockerProceed,
    blockerReset,
    blockerStatus,
    deletePending,
    handleDelete,
    handleSave,
    saving,
  } = useEntityEditor({
    allKey: mobKeys.all,
    data: mob,
    deletePath: `/api/mobs/${vnum}`,
    detailKey: mobKeys.detail(vnum),
    dirty,
    listPath: "/mobs",
    onReset: () => {
      setEdits(null);
      setExtraEdits(null);
      setImmEdits(null);
    },
    saveFn: async () => {
      if (!mob) {
        return null;
      }
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
  });

  if (isLoading || isError || !mob) {
    return (
      <QueryStatus
        backLabel="Mobs"
        backTo="/mobs"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`mob ${vnum}`}
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
                label: `Mob ${vnum}: ${mob.short_desc || "(unnamed)"}`,
              },
            ]}
          />
          <Button
            asChild
            size="sm"
            variant="outline"
          >
            <Link
              params={{ vnum: vnumParam }}
              to="/mobs/$vnum/responses"
            >
              Edit Responses
            </Link>
          </Button>
        </div>
        <h2 className="text-foreground text-xl font-bold">
          Mob {vnum}: {mob.short_desc || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete mob ${vnum}? This also removes extras, immunities, and responses.`}
        deletePending={deletePending}
        dirty={dirty}
        groups={mobFieldGroups}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onReset={() => {
          setEdits(null);
          setExtraEdits(null);
          setImmEdits(null);
        }}
        onSave={handleSave}
        originalValues={mobToFormValues(mob, null)}
        saving={saving}
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
          help="Percentage modifier: positive = resistance (100 = immune), negative = vulnerability (-100 = double damage)."
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
          blockerReset?.();
        }}
        onConfirm={() => {
          blockerProceed?.();
        }}
        open={blockerStatus === "blocked"}
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
