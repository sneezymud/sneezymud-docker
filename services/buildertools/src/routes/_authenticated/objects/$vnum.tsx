import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { FieldDef, FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  APPLY_TYPES,
  EXTRA_FLAGS,
  ITEM_TYPES,
  MATERIAL_TYPES,
  OBJ_SPEC_PROCS,
  WEAR_FLAGS,
} from "@/shared/enums/index.ts";
import {
  expandTypeValues,
  getObjTypeSpec,
  type ObjValueField,
  setBits,
} from "@/shared/obj-type-specs.ts";
import { objectKeys } from "@/shared/query-keys.ts";
import { objSchema } from "@/shared/schemas/obj.ts";

export const Route = createFileRoute("/_authenticated/objects/$vnum")({
  component: ObjectEditorPage,
});

const VAL_KEYS = ["val0", "val1", "val2", "val3"] as const;

function specFieldToFieldDef(field: ObjValueField): FieldDef {
  // Build base with only defined optional properties (exactOptionalPropertyTypes)
  const base: { help?: string; key: string; label: string } = {
    key: field.key,
    label: field.label,
  };
  if (field.help !== undefined) base.help = field.help;

  switch (field.input.type) {
    case "enum": {
      return { ...base, enumEntries: field.input.entries, type: "enum" };
    }
    case "number": {
      const numProps: { max?: number; min?: number; step?: number } = {};
      if (field.input.max !== undefined) numProps.max = field.input.max;
      if (field.input.min !== undefined) numProps.min = field.input.min;
      if (field.input.step !== undefined) numProps.step = field.input.step;
      return { ...base, ...numProps, type: "number" };
    }
    case "room": {
      return { ...base, type: "room" };
    }
  }
}

function getObjFieldGroups(itemType: number): FieldGroupDef[] {
  const spec = getObjTypeSpec(itemType);
  const typeSpecificGroup: FieldGroupDef | undefined = spec
    ? spec.fields.length > 0
      ? {
          fields: spec.fields.map(specFieldToFieldDef),
          title: "Type-Specific Values",
          tooltip: (
            <p>
              These values are interpreted based on the item type selected
              above. Labels and help text update automatically when you change
              the item type.
            </p>
          ),
        }
      : undefined
    : {
        fields: [
          { key: "val0", label: "Value 0", type: "number" as const },
          { key: "val1", label: "Value 1", type: "number" as const },
          { key: "val2", label: "Value 2", type: "number" as const },
          { key: "val3", label: "Value 3", type: "number" as const },
        ],
        title: "Type-Specific Values",
        tooltip: <p>Unknown item type. These are the raw database values.</p>,
      };
  return [
    {
      fields: [
        {
          fullWidth: true,
          key: "name",
          label: "Keywords",
          required: true,
          tooltip: (
            <p>
              Space-separated words players use to target this object (e.g.,
              "sword long steel"). Matching is substring-based. Use 3 - 4
              descriptive keywords covering appearance and material.
            </p>
          ),
          type: "text",
        },
        {
          fullWidth: true,
          key: "short_desc",
          label: "Short Description",
          required: true,
          tooltip: (
            <>
              <p>
                The name used in action messages. Write it{" "}
                <strong>lowercase</strong> with an article - the game
                capitalizes automatically at the start of sentences.
              </p>
              <ul>
                <li>
                  <strong>a long steel sword</strong> → "You pick up a long
                  steel sword."
                </li>
                <li>
                  <strong>an ornate golden ring</strong> → "An ornate golden
                  ring glows softly."
                </li>
                <li>
                  <strong>the Sword of Justice</strong> → for unique named items
                </li>
              </ul>
            </>
          ),
          type: "text",
        },
        {
          key: "long_desc",
          label: "Long Description",
          tooltip: (
            <p>
              What players see when the object is lying on the ground in a room.
              Should be a complete sentence in third person (e.g., "A rusty iron
              key lies here.").
            </p>
          ),
          type: "textarea",
        },
        {
          key: "action_desc",
          label: "Action Description",
          tooltip: (
            <p>
              Displayed when the item is activated or used (e.g., lamp igniting,
              instrument playing). Leave blank for most items - only needed for
              items with special activation messages.
            </p>
          ),
          type: "textarea",
        },
      ],
      title: "Identity",
      tooltip: (
        <p>
          Core strings that identify this object to players. Keywords determine
          how players target the object; descriptions appear in different
          contexts.
        </p>
      ),
    },
    {
      fields: [
        {
          enumEntries: ITEM_TYPES,
          key: "type",
          label: "Item Type",
          tooltip: (
            <p>
              Changing the item type changes the meaning of the four
              type-specific values below.
            </p>
          ),
          type: "enum",
        },
        {
          enumEntries: MATERIAL_TYPES,
          key: "material",
          label: "Material",
          tooltip: (
            <p>
              Affects item durability, damage interactions, weight modifiers,
              and repair costs. Choose a material that matches the item's
              physical composition.
            </p>
          ),
          type: "enum",
        },
        {
          bitfieldEntries: EXTRA_FLAGS,
          key: "action_flag",
          label: "Extra Flags",
          type: "bitfield",
        },
        {
          bitfieldEntries: WEAR_FLAGS,
          key: "wear_flag",
          label: "Wear Flags",
          type: "bitfield",
        },
      ],
      title: "Classification",
      tooltip: (
        <p>
          Item type determines the object's behavior and which type-specific
          values apply. Flags control visibility, restrictions, and special
          properties.
        </p>
      ),
    },
    ...(typeSpecificGroup ? [typeSpecificGroup] : []),
    {
      fields: [
        {
          help: "Item weight in pounds. Affects carrying capacity and container limits. Decimal values allowed.",
          key: "weight",
          label: "Weight",
          max: 500_000,
          min: 0,
          step: 0.1,
          type: "number",
        },
        {
          help: "Item volume in cubic inches. Must fit within container's max volume to be placed inside.",
          key: "volume",
          label: "Volume",
          max: 50_000,
          min: 0,
          step: 1,
          type: "number",
        },
        {
          help: "Base sale value in talens. Actual shop prices vary based on charisma and shop markup.",
          key: "price",
          label: "Price",
          max: 1_000_000,
          min: 0,
          step: 1,
          type: "number",
        },
      ],
      title: "Physical",
      tooltip: (
        <p>
          Physical properties affecting how the item interacts with carrying
          capacity, containers, shops, and crafting.
        </p>
      ),
    },
    {
      fields: [
        {
          detailedTooltip: (
            <>
              <p>
                Structure points represent item durability. When cur_struct
                reaches 0 from combat damage, the item is either destroyed or
                converted to a scrap pile (dropping any contents).
              </p>
              <p>
                The item's visible condition is based on cur_struct /
                max_struct:
              </p>
              <table className="border-border mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-border border px-2 py-1 text-left">
                      Ratio
                    </th>
                    <th className="border-border border px-2 py-1 text-left">
                      Condition
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-border border px-2 py-1">1.0</td>
                    <td className="border-border border px-2 py-1">
                      brand new
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">&gt; 0.9</td>
                    <td className="border-border border px-2 py-1">like new</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">&gt; 0.7</td>
                    <td className="border-border border px-2 py-1">
                      very good
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">&gt; 0.5</td>
                    <td className="border-border border px-2 py-1">fine</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">&gt; 0.3</td>
                    <td className="border-border border px-2 py-1">poor</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">&gt; 0.1</td>
                    <td className="border-border border px-2 py-1">bad</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">
                      &le; 0.001
                    </td>
                    <td className="border-border border px-2 py-1">
                      destroyed
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2">
                Set max_struct = 0 for items that should not participate in the
                durability system (they will always show as "brand new" and
                cannot be damaged). The in-game oedit enforces -1 to 32767.
              </p>
            </>
          ),
          help: "Maximum structural integrity (0-32767). 0 = no durability system. Set both values equal for brand new items.",
          key: "max_struct",
          label: "Max Structure",
          max: 32_767,
          min: -1,
          step: 1,
          type: "number",
        },
        {
          help: "Current structural integrity (0-32767). When this reaches 0, the item is destroyed or reduced to scraps.",
          key: "cur_struct",
          label: "Current Structure",
          max: 32_767,
          min: -1,
          step: 1,
          type: "number",
        },
        {
          detailedTooltip: (
            <>
              <p>
                Each decay tick is one MUD hour (Pulse::MUDHOUR = 144 real
                seconds, about 2 minutes 24 seconds). The counter only
                decrements while the item is sitting on the ground in a room -
                items in inventory or equipped do not decay.
              </p>
              <p>
                When the counter reaches 0, the item is destroyed with a
                message. Container contents are spilled.
              </p>
              <table className="border-border mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-border border px-2 py-1 text-left">
                      decay_time
                    </th>
                    <th className="border-border border px-2 py-1 text-left">
                      Real-time lifespan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-border border px-2 py-1">-1</td>
                    <td className="border-border border px-2 py-1">
                      Never decays
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">1</td>
                    <td className="border-border border px-2 py-1">
                      ~2.4 minutes
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">10</td>
                    <td className="border-border border px-2 py-1">
                      ~24 minutes
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">25</td>
                    <td className="border-border border px-2 py-1">~1 hour</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">50</td>
                    <td className="border-border border px-2 py-1">~2 hours</td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">100</td>
                    <td className="border-border border px-2 py-1">~4 hours</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2">
                Common usage: -1 for permanent items, 1-10 for temporary spell
                effects, 25-100 for items that should eventually clean up.
              </p>
            </>
          ),
          help: "MUD-hour ticks until item decays. -1 = never. Only decrements while on the ground.",
          key: "decay",
          label: "Decay Time",
          max: 10_000,
          min: -1,
          step: 1,
          type: "number",
        },
        {
          help: "Maximum concurrent instances in the world (0-9999). 9999 = unlimited.",
          key: "max_exist",
          label: "Max Exist",
          max: 9999,
          min: 0,
          step: 1,
          type: "number",
        },
        {
          detailedTooltip: (
            <>
              <p>
                An observer's eyeSight (calculated from room lighting + racial
                vision bonus + spell effects) must meet or exceed this value to
                see the item on the ground. Items in inventory or equipped are
                4-7 points easier to see.
              </p>
              <table className="border-border mt-2 w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-border border px-2 py-1 text-left">
                      Value
                    </th>
                    <th className="border-border border px-2 py-1 text-left">
                      Practical Effect
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-border border px-2 py-1">0</td>
                    <td className="border-border border px-2 py-1">
                      Visible to anyone with any light source (default)
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">1-10</td>
                    <td className="border-border border px-2 py-1">
                      Hidden in dim rooms; visible in normal lighting
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">11-20</td>
                    <td className="border-border border px-2 py-1">
                      Only visible in bright conditions or with vision spells
                    </td>
                  </tr>
                  <tr>
                    <td className="border-border border px-2 py-1">21-25</td>
                    <td className="border-border border px-2 py-1">
                      Nearly invisible; requires True Sight, Clarity, or
                      excellent conditions
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-2">
                <strong>Bypasses (always visible):</strong> Item has GLOW or
                BURNING flag, item emits light, room has ALWAYS_LIT, observer
                has True Sight/Clarity.
              </p>
              <p>
                <strong>Blocks (invisible regardless):</strong> Item has
                INVISIBLE flag and observer lacks Detect Invisible.
              </p>
              <p>
                <strong>Note:</strong> A value of 0 does NOT mean "always
                visible" - the item is still invisible in pitch darkness with no
                light sources.
              </p>
            </>
          ),
          help: "Visibility threshold (0-25). Higher = harder to spot on the ground. 0 = visible in any light.",
          key: "can_be_seen",
          label: "Can Be Seen",
          max: 25,
          min: 0,
          step: 1,
          type: "number",
        },
        {
          enumEntries: OBJ_SPEC_PROCS,
          key: "spec_proc",
          label: "Special Proc",
          type: "enum",
        },
      ],
      title: "Limits & Behavior",
      tooltip: (
        <p>Durability, lifespan, visibility, and special behavior controls.</p>
      ),
    },
  ];
}

const affectColumns: Array<ColumnDef<ObjAffect>> = [
  {
    entries: APPLY_TYPES,
    key: "type",
    label: "Apply Type",
    type: "enum",
    width: "200px",
  },
  { key: "mod1", label: "Modifier", type: "number", width: "120px" },
  { key: "mod2", label: "Modifier 2", type: "number", width: "120px" },
];

const extraColumns: Array<ColumnDef<ObjExtra>> = [
  { key: "name", label: "Keywords", type: "tags", width: "250px" },
  { key: "description", label: "Description", type: "textarea", width: "1fr" },
];

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

function ObjectEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);

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

  const {
    blockerProceed,
    blockerReset,
    blockerStatus,
    deletePending,
    handleDelete,
    handleSave,
    saving,
  } = useEntityEditor({
    allKey: objectKeys.all,
    data: obj,
    deletePath: `/api/objects/${vnum}`,
    detailKey: objectKeys.detail(vnum),
    dirty,
    listPath: "/objects",
    onReset: () => {
      setEdits(null);
      setAffectEdits(null);
      setExtraEdits(null);
    },
    saveFn: async () => {
      if (!obj) {
        return null;
      }
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

  if (isLoading || isError || !obj) {
    return (
      <QueryStatus
        backLabel="Objects"
        backTo="/objects"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`object ${vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  const currentValues = objToFormValues(obj, edits);
  const currentItemType =
    typeof currentValues["type"] === "number" ? currentValues["type"] : 0;
  const typeSpec = getObjTypeSpec(currentItemType);

  // Expand virtual keys from raw val0-val3 using the current type spec
  const rawVals: [number, number, number, number] = [
    Number(currentValues["val0"] ?? 0),
    Number(currentValues["val1"] ?? 0),
    Number(currentValues["val2"] ?? 0),
    Number(currentValues["val3"] ?? 0),
  ];
  const expandedValues =
    typeSpec && typeSpec.fields.length > 0
      ? { ...currentValues, ...expandTypeValues(typeSpec, rawVals) }
      : currentValues;

  const originalBase = objToFormValues(obj, null);
  const originalRaw: [number, number, number, number] = [
    Number(originalBase["val0"] ?? 0),
    Number(originalBase["val1"] ?? 0),
    Number(originalBase["val2"] ?? 0),
    Number(originalBase["val3"] ?? 0),
  ];
  const expandedOriginal =
    typeSpec && typeSpec.fields.length > 0
      ? { ...originalBase, ...expandTypeValues(typeSpec, originalRaw) }
      : originalBase;

  const handleFieldChange = (key: string, value: number | string) => {
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
          return { ...prev, [valKey]: packed };
        });
        return;
      }
    }
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-4 space-y-1">
        <Breadcrumbs
          items={[
            { label: "Objects", to: "/objects" },
            {
              label: `Object ${vnum}: ${obj.short_desc || "(unnamed)"}`,
            },
          ]}
        />
        <h2 className="text-foreground text-xl font-bold">
          Object {vnum}: {obj.short_desc || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete object ${vnum}? This also removes all affects and extra descriptions.`}
        deletePending={deletePending}
        dirty={dirty}
        groups={getObjFieldGroups(currentItemType)}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onReset={() => {
          setEdits(null);
          setAffectEdits(null);
          setExtraEdits(null);
        }}
        onSave={handleSave}
        originalValues={expandedOriginal}
        saving={saving}
        values={expandedValues}
      >
        <SubTable
          columns={affectColumns}
          emptyRow={{ mod1: 0, mod2: 0, type: 0, vnum }}
          help="Each apply modifies a character stat when the object is equipped. Max 5 applies per object."
          label="Applies"
          onChange={setAffectEdits}
          rows={affectEdits ?? obj.affects}
          singularLabel="apply"
        />
        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", name: "", vnum }}
          help="Space-separated keywords players can 'look' at to see the description. Substring matching applies."
          label="Extra Descriptions"
          onChange={setExtraEdits}
          rows={extraEdits ?? obj.extras}
          singularLabel="extra description"
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

function ObjectEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <ObjectEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
