import type { ObjValueField } from "@/shared/obj-type-specs.ts";
import type { BuilderPermissions } from "@/shared/permissions.ts";
import type { FieldDef, FieldGroupDef } from "@/shared/types/entity-form.ts";

import { TooltipTable } from "@/components/tooltip-table.tsx";
import {
  EXTRA_FLAGS,
  ITEM_TYPES,
  MATERIAL_TYPES,
  OBJ_SPEC_PROCS,
  WEAR_FLAGS,
} from "@/shared/enums/index.ts";
import { getObjTypeSpec } from "@/shared/obj-type-specs.ts";
import {
  gateSpecProcs,
  isUnassignableObjSpecProc,
} from "@/shared/spec-proc-access.ts";

export const VAL_KEYS = ["val0", "val1", "val2", "val3"] as const;

const ITEM_WEAPON = 5;

export function getObjFieldGroups(
  itemType: number,
  permissions: BuilderPermissions,
) {
  const spec = getObjTypeSpec(itemType);
  const weaponReadOnly =
    itemType === ITEM_WEAPON && !permissions.canEditObjectWeapons;
  const weaponReadOnlyOverrides = weaponReadOnly
    ? { disabledReason: "Requires POWER_OEDIT_WEAPONS", readOnly: true }
    : {};

  const typeSpecificFields: FieldDef[] = spec
    ? spec.fields.map((f) => ({
        ...specFieldToFieldDef(f),
        ...weaponReadOnlyOverrides,
      }))
    : VAL_KEYS.map((key, i) => ({
        key,
        label: `Value ${i}`,
        type: "number" as const,
        ...weaponReadOnlyOverrides,
      }));

  const typeSpecificTooltip = spec ? (
    <p>
      These values are interpreted based on the item type. Labels and help text
      update automatically when you change the item type.
    </p>
  ) : (
    <p>Unknown item type. These are the raw database values.</p>
  );

  return OBJ_FIELD_GROUPS_BASE.map((group) => {
    switch (group.title) {
      case "Extra Flags": {
        if (!permissions.canEditPrototypeFlag) {
          return group;
        }
        return {
          ...group,
          fields: group.fields.map((f) =>
            f.key === "action_flag" && f.type === "bitfield"
              ? {
                  ...f,
                  bitfieldEntries: f.bitfieldEntries.map((e) =>
                    e.bit === 4 ? { bit: e.bit, label: e.label } : e,
                  ),
                }
              : f,
          ),
        };
      }
      case "Limits & Behavior": {
        if (permissions.canEditUnassignableObjSpecProc) {
          return group;
        }
        return {
          ...group,
          fields: group.fields.map((f) =>
            f.key === "spec_proc" && f.type === "enum"
              ? {
                  ...f,
                  enumEntries: gateSpecProcs(
                    f.enumEntries,
                    isUnassignableObjSpecProc,
                  ),
                }
              : f,
          ),
        };
      }
      case "Physical": {
        if (permissions.canEditObjectCost) {
          return group;
        }
        return {
          ...group,
          fields: group.fields.map((f) =>
            f.key === "price"
              ? {
                  ...f,
                  disabledReason: "Requires POWER_OEDIT_COST",
                  readOnly: true,
                }
              : f,
          ),
        };
      }
      case "Type-Specific Values": {
        return {
          ...group,
          fields: [...group.fields, ...typeSpecificFields],
          tooltip: typeSpecificTooltip,
        };
      }
      default: {
        return group;
      }
    }
  });
}

const OBJ_FIELD_GROUPS_BASE: FieldGroupDef[] = [
  {
    defaultExpanded: true,
    fields: [
      {
        fullWidth: true,
        key: "name",
        label: "Keywords",
        required: true,
        tooltip: (
          <p>
            Space-separated words players use to target this object (e.g.,
            "sword long steel"). The first keyword is the primary identifier -
            the game's <code>fname()</code> extracts it for abbreviated matching
            in action messages. Matching is substring-based. Use 3 - 4
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
              <strong>lowercase</strong> with an article - the game capitalizes
              automatically at the start of sentences.
            </p>

            <ul>
              <li>
                <strong>a long steel sword</strong> → "You pick up a long steel
                sword."
              </li>

              <li>
                <strong>an ornate golden ring</strong> → "An ornate golden ring
                glows softly."
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
            key lies here."). Supports <code>$g</code> placeholder - replaced
            with the room's ground surface based on sector type (e.g., "stone
            floor", "water", "forest floor").
          </p>
        ),
        type: "textarea",
      },
      {
        key: "action_desc",
        label: "Action Description",
        tooltip: (
          <p>
            For notes, this is the written content shown when the note is
            examined. For personalized items, triggers monogram display. Most
            items leave this blank.
          </p>
        ),
        type: "textarea",
      },
    ],
    title: "Identity",
  },
  {
    defaultExpanded: false,
    fields: [
      {
        enumEntries: ITEM_TYPES,
        key: "type",
        label: "Item Type",
        type: "enum",
      },
    ],
    title: "Type-Specific Values",
  },
  {
    defaultExpanded: false,
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
        integer: true,
        key: "volume",
        label: "Volume",
        max: 50_000,
        min: 0,
        step: 1,
        type: "number",
      },
      {
        help: "Base sale value in talens. Actual shop prices vary based on charisma and shop markup.",
        integer: true,
        key: "price",
        label: "Price",
        max: 1_000_000,
        min: 0,
        step: 1,
        type: "number",
      },
      {
        enumEntries: MATERIAL_TYPES,
        key: "material",
        label: "Material",
        tooltip: (
          <p>
            Affects item durability, damage interactions, weight modifiers, and
            repair costs. Choose a material that matches the item's physical
            composition.
          </p>
        ),
        type: "enum",
      },
    ],
    title: "Physical",
  },
  {
    defaultExpanded: false,
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
              The item's visible condition is based on cur_struct / max_struct:
            </p>

            <TooltipTable
              columns={["Ratio", "Condition"]}
              rows={[
                ["1.0", "brand new"],
                ["> 0.9", "like new"],
                ["> 0.7", "very good"],
                ["> 0.5", "fine"],
                ["> 0.3", "poor"],
                ["> 0.1", "bad"],
                ["≤ 0.001", "destroyed"],
              ]}
            />

            <p className="mt-2">
              Set max_struct = 0 for items that should not participate in the
              durability system (they will always show as "brand new" and cannot
              be damaged). The in-game oedit enforces -1 to 32767.
            </p>
          </>
        ),
        help: "Maximum structural integrity (0-32767). 0 = no durability system. Set both values equal for brand new items.",
        integer: true,
        key: "max_struct",
        label: "Max Structure",
        max: 32_767,
        min: -1,
        step: 1,
        type: "number",
      },
      {
        help: "Current structural integrity (0-32767). When this reaches 0, the item is destroyed or reduced to scraps.",
        integer: true,
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
              seconds, about 2 minutes 24 seconds). The counter only decrements
              while the item is sitting on the ground in a room - items in
              inventory or equipped do not decay.
            </p>

            <p>
              When the counter reaches 0, the item is destroyed with a message.
              Container contents are spilled.
            </p>

            <TooltipTable
              columns={["decay_time", "Real-time lifespan"]}
              rows={[
                ["-1", "Never decays"],
                ["1", "~2.4 minutes"],
                ["10", "~24 minutes"],
                ["25", "~1 hour"],
                ["50", "~2 hours"],
                ["100", "~4 hours"],
              ]}
            />

            <p className="mt-2">
              Common usage: -1 for permanent items, 1-10 for temporary spell
              effects, 25-100 for items that should eventually clean up.
            </p>
          </>
        ),
        help: "MUD-hour ticks until item decays. -1 = never. Only decrements while on the ground.",
        integer: true,
        key: "decay",
        label: "Decay Time",
        max: 10_000,
        min: -1,
        step: 1,
        type: "number",
      },
      {
        help: "Maximum concurrent instances in the world (0-9999). 9999 = unlimited.",
        integer: true,
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
              see the item on the ground. Items in inventory or equipped are 4-7
              points easier to see.
            </p>

            <TooltipTable
              columns={["Value", "Practical Effect"]}
              rows={[
                ["0", "Visible to anyone with any light source (default)"],
                ["1-10", "Hidden in dim rooms; visible in normal lighting"],
                [
                  "11-20",
                  "Only visible in bright conditions or with vision spells",
                ],
                [
                  "21-25",
                  "Nearly invisible; requires True Sight, Clarity, or excellent conditions",
                ],
              ]}
            />

            <p className="mt-2">
              <strong>Bypasses (always visible):</strong> Item has GLOW or
              BURNING flag, item emits light, room has ALWAYS_LIT, observer has
              True Sight/Clarity.
            </p>

            <p>
              <strong>Blocks (invisible regardless):</strong> Item has INVISIBLE
              flag and observer lacks Detect Invisible.
            </p>

            <p>
              <strong>Note:</strong> A value of 0 does NOT mean "always visible"
              - the item is still invisible in pitch darkness with no light
              sources.
            </p>
          </>
        ),
        help: "Visibility threshold (0-25). Higher = harder to spot on the ground. 0 = visible in any light.",
        integer: true,
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
        label: "Spec Proc",
        type: "enum",
      },
    ],
    title: "Limits & Behavior",
  },
  {
    defaultExpanded: false,
    fields: [
      {
        bitfieldEntries: EXTRA_FLAGS,
        key: "action_flag",
        label: "",
        type: "bitfield",
      },
    ],
    title: "Extra Flags",
  },
  {
    defaultExpanded: false,
    fields: [
      {
        bitfieldEntries: WEAR_FLAGS,
        key: "wear_flag",
        label: "",
        type: "bitfield",
      },
    ],
    title: "Wear Flags",
    tooltip: (
      <p>
        Equipment slots where this item can be worn or held. TAKE is required
        for players to pick up the item. Most items need both TAKE and one wear
        position.
      </p>
    ),
  },
];

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
