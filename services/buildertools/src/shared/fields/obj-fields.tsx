import type { ObjValueField } from "@/shared/obj-type-specs.ts";
import type { FieldDef, FieldGroupDef } from "@/shared/types/entity-form.ts";

import {
  EXTRA_FLAGS,
  ITEM_TYPES,
  MATERIAL_TYPES,
  OBJ_SPEC_PROCS,
  WEAR_FLAGS,
} from "@/shared/enums/index.ts";
import { getObjTypeSpec } from "@/shared/obj-type-specs.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import {
  gateSpecProcs,
  isUnassignableObjSpecProc,
} from "@/shared/spec-proc-access.ts";

export const VAL_KEYS = ["val0", "val1", "val2", "val3"] as const;

export function specFieldToFieldDef(field: ObjValueField): FieldDef {
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

export function getObjFieldGroups(
  itemType: number,
  powers: number[],
): FieldGroupDef[] {
  const spec = getObjTypeSpec(itemType);

  const itemTypeField: FieldDef = {
    enumEntries: ITEM_TYPES,
    key: "type",
    label: "Item Type",
    type: "enum",
  };

  const ITEM_WEAPON = 5;
  const weaponReadOnly =
    itemType === ITEM_WEAPON && !hasPower(powers, POWER.OEDIT_WEAPONS);

  const typeSpecificFields: FieldDef[] = spec
    ? spec.fields.map((f) => {
        const def = specFieldToFieldDef(f);
        if (weaponReadOnly) {
          def.readOnly = true;
        }
        return def;
      })
    : [
        {
          key: "val0",
          label: "Value 0",
          readOnly: weaponReadOnly,
          type: "number" as const,
        },
        {
          key: "val1",
          label: "Value 1",
          readOnly: weaponReadOnly,
          type: "number" as const,
        },
        {
          key: "val2",
          label: "Value 2",
          readOnly: weaponReadOnly,
          type: "number" as const,
        },
        {
          key: "val3",
          label: "Value 3",
          readOnly: weaponReadOnly,
          type: "number" as const,
        },
      ];

  const typeSpecificTooltip = spec ? (
    <p>
      These values are interpreted based on the item type. Labels and help text
      update automatically when you change the item type.
    </p>
  ) : (
    <p>Unknown item type. These are the raw database values.</p>
  );
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
              "sword long steel"). The first keyword is the primary identifier -
              the game's <code>fname()</code> extracts it for abbreviated
              matching in action messages. Matching is substring-based. Use 3 -
              4 descriptive keywords covering appearance and material.
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
      fields: [itemTypeField, ...typeSpecificFields],
      title: "Type-Specific Values",
      tooltip: typeSpecificTooltip,
    },
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
          readOnly: !hasPower(powers, POWER.OEDIT_COST),
          step: 1,
          type: "number",
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
      ],
      title: "Physical",
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
          enumEntries: hasPower(powers, POWER.OEDIT_IMP_POWER)
            ? OBJ_SPEC_PROCS
            : gateSpecProcs(OBJ_SPEC_PROCS, isUnassignableObjSpecProc),
          key: "spec_proc",
          label: "Spec Proc",
          type: "enum",
        },
      ],
      title: "Limits & Behavior",
    },
    {
      fields: [
        {
          bitfieldEntries: hasPower(powers, POWER.OEDIT_NOPROTOS)
            ? EXTRA_FLAGS.map((e) =>
                e.bit === 4 ? { bit: e.bit, label: e.label } : e,
              )
            : EXTRA_FLAGS,
          key: "action_flag",
          label: "",
          type: "bitfield",
        },
      ],
      title: "Extra Flags",
    },
    {
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
          for players to pick up the item. Most items need both TAKE and one
          wear position.
        </p>
      ),
    },
  ];
}
