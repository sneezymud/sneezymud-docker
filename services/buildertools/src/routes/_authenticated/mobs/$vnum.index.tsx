import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { useState } from "react";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type {
  Mob,
  MobExtra,
  MobImm,
  MobStringKeyword,
} from "@/shared/schemas/mob.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  CLASS_TYPES,
  DEFAULT_POSITION_TYPES,
  FACTION_TYPES,
  IMMUNITY_TYPES,
  MATERIAL_TYPES,
  MOB_ACTIONS,
  MOB_AFFECTS,
  MOB_SPEC_PROCS,
  RACE_TYPES,
  SEX_TYPES,
} from "@/shared/enums/index.ts";
import { mobKeys } from "@/shared/query-keys.ts";
import {
  mobExtraSchema,
  mobSchema,
  mobStringKeywords,
} from "@/shared/schemas/mob.ts";

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
        tooltip: (
          <p>
            Space-separated words players use to target this mob (e.g., "guard
            town human"). Matching is substring-based, so "guard town human"
            matches "guard", "town", "human", or "2.guard" for the second
            matching mob. Use 3 - 4 descriptive keywords.
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
              The name used in combat and action messages. Write it{" "}
              <strong>lowercase</strong> with an article - the game capitalizes
              automatically at the start of sentences.
            </p>
            <ul>
              <li>
                <strong>a town guard</strong> → "A town guard hits you."
              </li>
              <li>
                <strong>an old drunk man</strong> → "An old drunk man staggers
                in."
              </li>
              <li>
                <strong>the Tormenter</strong> → for unique named mobs
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
            What players see when they enter the room, but only while the mob is
            in its default position. Describe the mob as it appears in that pose
            (e.g., "A burly guard stands watch at the gate.").
          </p>
        ),
        type: "textarea",
      },
      {
        key: "description",
        label: "Detailed Description",
        tooltip: (
          <>
            <p>
              Full description shown when a player looks at the mob. Describe
              appearance, clothing, and notable features in a few sentences. Try
              to keep in mind what the mob can load, and avoid contradicting
              those details in the long description.
            </p>
            <p className="mt-1.5">
              <span className="text-destructive font-medium">Bad:</span> {'"'}
              This heavyset guard wears dented chainmail and a bored expression.
              A short sword hangs at his hip.{'"'}
            </p>
            <p className="mt-1">
              <span className="font-medium text-emerald-500">Good:</span> {'"'}
              This heavyset guard breathes heavily as he marches on, performing
              his duties. Despite his bulk, he looks like he knows how to use a
              weapon if he has to.{'"'}
            </p>
          </>
        ),
        type: "textarea",
      },
    ],
    title: "Identity",
  },
  {
    fields: [
      {
        key: "level",
        label: "Level",
        max: 100,
        min: 1,
        required: true,
        tooltip: (
          <p>
            The mob's power level. Determines base HP, damage output, and
            defense scaling. This is the single most important stat for overall
            difficulty.
          </p>
        ),
        type: "number",
      },
      {
        key: "attacks",
        label: "Attacks",
        min: 0,
        step: 0.1,
        tooltip: (
          <>
            <p>
              Number of attacks per combat round. Attacks are distributed across
              the round, capped at 12.
            </p>
            <p>Typical ranges:</p>
            <ul>
              <li>
                <strong>1 - 3</strong> - common mobs
              </li>
              <li>
                <strong>5 - 8</strong> - bosses
              </li>
              <li>
                <strong>12</strong> - raid encounters
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        key: "tohit",
        label: "To-Hit",
        max: 50,
        min: -50,
        tooltip: (
          <>
            <p>
              Bonus added to all melee attack rolls. Higher values make the mob
              hit more reliably.
            </p>
            <p>Typical ranges:</p>
            <ul>
              <li>
                <strong>0 - 50</strong> - weak mobs (relies on level)
              </li>
              <li>
                <strong>50 - 150</strong> - mid-tier
              </li>
              <li>
                <strong>150+</strong> - challenging encounters
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        key: "ac",
        label: "AC Level",
        max: 127,
        min: 0,
        step: 0.1,
        tooltip: (
          <>
            <p>
              <strong>AC Level</strong> is the value stored in the database. The
              game converts it to effective AC:
            </p>
            <p>
              <strong>{"Effective AC = 600 - (20 × AC Level)"}</strong>
            </p>
            <p>Reference values:</p>
            <ul>
              <li>
                <strong>0</strong> → AC 600 (no armor)
              </li>
              <li>
                <strong>10</strong> → AC 400
              </li>
              <li>
                <strong>20</strong> → AC 200
              </li>
              <li>
                <strong>30</strong> → AC 0 (heavily armored)
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        key: "hpbonus",
        label: "HP Bonus",
        max: 127,
        min: 0,
        step: 0.1,
        tooltip: (
          <>
            <p>
              Additive bonus to the mob's hit points. Combined with damage
              level:
            </p>
            <p>
              <strong>{"max HP = damage_level × 100 + hpbonus"}</strong>
            </p>
            <p>Typical ranges:</p>
            <ul>
              <li>
                <strong>50 - 200</strong> - weak mobs
              </li>
              <li>
                <strong>500 - 2,000</strong> - bosses
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        key: "damage_level",
        label: "Damage Level",
        max: 127,
        min: 0,
        step: 0.1,
        tooltip: (
          <>
            <p>
              Multiplier that scales both damage output and base HP. This is the
              primary difficulty knob alongside level.
            </p>
            <p>Typical ranges:</p>
            <ul>
              <li>
                <strong>0.5 - 1.0</strong> - weak
              </li>
              <li>
                <strong>1.0 - 3.0</strong> - medium
              </li>
              <li>
                <strong>3.0 - 8.0</strong> - strong
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        key: "damage_precision",
        label: "Damage Precision",
        max: 100,
        min: 0,
        tooltip: (
          <>
            <p>
              Controls damage variance (0 - 100). Low values produce consistent,
              predictable damage. High values create more swingy combat.
            </p>
            <ul>
              <li>
                <strong>0 - 30</strong> - very consistent
              </li>
              <li>
                <strong>50 - 70</strong> - moderate variance
              </li>
              <li>
                <strong>80 - 100</strong> - wild swings
              </li>
            </ul>
          </>
        ),
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
            <strong>-25</strong> = maximum penalty
          </li>
        </ul>
        <p className="mt-1.5">
          <strong>Stat group sums</strong> should generally be 0 or less:
        </p>
        <ul>
          <li>
            <strong>Physical:</strong> STR + BRA + CON
          </li>
          <li>
            <strong>Mental:</strong> INT + WIS + FOC
          </li>
          <li>
            <strong>Utility:</strong> DEX + AGI + SPE + PER + CHA + KAR
          </li>
        </ul>
      </>
    ),
  },
  {
    fields: [
      {
        detailedTooltip: (
          <>
            <p>
              The most consequential property on a mob. Race touches nearly
              every game system and is the primary driver of what a mob can do,
              how it fights, and how players interact with it.
            </p>

            <p>
              <strong>Base stats:</strong> Race defines base values for all 12
              stats based on the values in the relevant race file in
              <code> lib/races</code>.
            </p>

            <p>
              <strong>Body type:</strong> Each race has a specific body type
              (again defined in its race file) for all beings of that race,
              which determines available body parts, equipment slots, limb
              descriptions, unarmed attack names, and which combat skills the
              mob can use (e.g. snakes/fish/birds can't trip or bash). Many
              races share a body type.
            </p>

            <p>
              <strong>Immunities and vulnerabilities.</strong> Each race has
              percentage-based resistances or weaknesses to 28 damage types.
              Examples: undead are immune to drain/poison/sleep/fear but
              vulnerable to holy; trolls are vulnerable to fire; dragons resist
              heat, cold, sleep, charm, and nonmagic weapons.
            </p>

            <p>
              <strong>Lore kingdom.</strong> Every race belongs to one of 8
              kingdoms (animal, veggie, diabolic, reptile, undead, giant,
              people, other). This determines which lore skill players need to
              identify the mob, and enables ranger consecration bonuses and
              weapon damage bonuses (blessed/silver vs undead/diabolic). Undead
              act flags override the original kingdom.
            </p>

            <p>
              <strong>Automatic affects.</strong> Many races receive affects on
              load: infravision (dwarves, gnomes, orcs, trolls, etc.), flying
              (orbs, djinn, air elementals), waterbreath + swim (fish, mermaid,
              octopus), true sight (devils, kuotoa), and +150 max movement
              (horse, pegasus, dragon).
            </p>

            <p>
              <strong>Racial characteristics.</strong> Flags like Dumb Animal
              (tameable by rangers, can't speak), Aquatic (dies out of water),
              Winged (can fly), Four-Legged (harder to trip), Ridable,
              Cold-Blooded (invisible to infravision), and Boneless (immune to
              bone breaks).
            </p>

            <p>
              <strong>Racial talents.</strong> Special abilities like fast HP
              regen (trolls), limb regrowth, frog slime skin (escape
              swallowing), musk spray (defensive), and dietary specializations
              (fish/meat/insect/garbage eater).
            </p>

            <p>
              <strong>Regen and armor.</strong> Race adds direct modifiers to
              mana regen and max movement. Aquatic races regen 30% faster when
              wet, 50% slower when dry. Fishman is the only race with natural
              bonus armor.
            </p>

            <p>
              <strong>Movement.</strong> Race determines custom arrive/leave
              messages ("stomps in", "slithers", "flies in"). Dwarves pay +20
              movement in water and drown more easily. Flying reduces movement
              cost to 25%.
            </p>

            <p>
              <strong>Vision.</strong> Race contributes a vision bonus, line of
              sight range (elves/drow +5), and infravision. Undead emit darkness
              proportional to level.
            </p>

            <p>
              <strong>Skills.</strong> Elves get 2x track/scan range; dwarves
              get +blacksmith efficiency for metal; gnomes/dwarves get search
              bonuses; hobbits get minimum 80 steal skill and pipeweed immunity.
            </p>

            <p>
              <strong>Mob AI.</strong> Dumb animals use growl/bark/hiss instead
              of speech. Mobs can hate/fear entire races. Aquatic mobs out of
              water die (except fishman). Same race + same faction = friend for
              NPC assist behavior.
            </p>

            <p>
              <strong>Riding:</strong> A being's race determines which riding
              skill is necessary to ride it: domestic (horse, bovine),
              nondomestic (rhino, bear), winged (griffon, dragon), or exotic
              (everything else). Must also have the Ridable racial flag defined
              in its race file.
            </p>

            <p>
              <strong>Spell interactions:</strong> Undead are immune to
              paralysis/bleed/wither/infect spells and targetable by Turn Undead
              and Control Undead. Diabolic creatures can be Turned at +50%
              difficulty. Dumb animals are targetable by ranger beast skills.
            </p>

            <p>
              <strong>Language:</strong> Some races have garble flags,
              effectively making beings of that race speak a different native
              language. Non-native speakers of a specific language (i.e. a race
              that doesn't share that same garble type) will have difficulty
              understanding it, though the effects are lessened as the
              listener's INT increases, or via the language skills available to
              all characters in the advanced adventuring discipline.
            </p>

            <p>
              <strong>Other:</strong> Race determines corpse appearance (undead
              become dust, elementals leave unique remains), dissection drops,
              food/drink metabolism rates, and diet restrictions.
            </p>
          </>
        ),
        enumEntries: RACE_TYPES,
        key: "race",
        label: "Race",
        tooltip: (
          <p>
            The most consequential mob property. Sets base stats, body type,
            immunities/vulnerabilities, lore kingdom, racial abilities, and
            movement. Affects nearly every game system from combat formulas to
            spell interactions.
          </p>
        ),
        type: "enum",
      },
      {
        enumEntries: SEX_TYPES,
        key: "sex",
        label: "Sex",
        tooltip: (
          <p>
            Affects pronouns in game messages (he/she/it) and some
            gender-specific interactions.
          </p>
        ),
        type: "enum",
      },
      {
        key: "weight",
        label: "Weight",
        max: 100_000,
        min: 0,
        tooltip: (
          <>
            <p>
              Body weight in pounds (1 - 100,000). Set directly by the builder -
              race has no effect on mob weight.
            </p>
            <p>Reference weights:</p>
            <ul>
              <li>
                <strong>1 - 10</strong> - tiny creatures (rats, birds)
              </li>
              <li>
                <strong>100 - 200</strong> - human-sized
              </li>
              <li>
                <strong>500 - 1,000</strong> - horses, bears
              </li>
              <li>
                <strong>10,000+</strong> - dragons, giants
              </li>
            </ul>
            <p>
              Affects bash/bodyslam effectiveness, encumbrance, and mount
              capacity. A value of 0 (the default) is nonsensical - always set
              this.
            </p>
          </>
        ),
        type: "number",
      },
      {
        key: "height",
        label: "Height",
        max: 10_000,
        min: 0,
        tooltip: (
          <>
            <p>
              Standing height in inches (1 - 10,000). Set directly by the
              builder - race has no effect on mob height.
            </p>
            <p>Reference heights:</p>
            <ul>
              <li>
                <strong>6 - 12</strong> - small animals
              </li>
              <li>
                <strong>36 - 48</strong> - hobbits, gnomes
              </li>
              <li>
                <strong>66 - 78</strong> - human-sized
              </li>
              <li>
                <strong>96 - 120</strong> - ogres, giants
              </li>
            </ul>
            <p>
              Affects combat reach, hit location targeting, and mount
              compatibility. A value of 0 (the default) is nonsensical - always
              set this.
            </p>
          </>
        ),
        type: "number",
      },
      {
        enumEntries: MATERIAL_TYPES,
        key: "skin",
        label: "Skin",
        tooltip: (
          <p>
            The material the mob's skin or hide is made of. Affects armor
            protection effectiveness, durability, and crafting interactions.
            Visible when players examine the mob.
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
        key: "gold",
        label: "Gold Constant",
        max: 10,
        min: 0,
        tooltip: (
          <>
            <p>
              A constant (0 - 10), not a raw gold amount. The game computes
              actual gold at load time:
            </p>
            <p>
              <strong>
                {"gold = level × max(20, level) × constant × 0.75"}
              </strong>
            </p>
            <p>Example values for a level 50 mob:</p>
            <ul>
              <li>
                <strong>1</strong> → 1,875 gold
              </li>
              <li>
                <strong>3</strong> → 5,625 gold
              </li>
              <li>
                <strong>5</strong> → 9,375 gold
              </li>
              <li>
                <strong>10</strong> → 18,750 gold
              </li>
            </ul>
            <p>
              Shopkeepers get 5× this amount. Set to <strong>0</strong> for mobs
              that carry no gold.
            </p>
          </>
        ),
        type: "number",
      },
      {
        key: "max_exist",
        label: "Max Exist",
        max: 9999,
        min: 0,
        tooltip: (
          <p>
            Maximum concurrent instances of this mob in the world. When the
            limit is reached, zones will not load additional copies. Set to{" "}
            <strong>0</strong> for unlimited. Use <strong>1</strong> for unique
            bosses or named NPCs.
          </p>
        ),
        type: "number",
      },
      {
        key: "can_be_seen",
        label: "Can Be Seen",
        max: 10_000,
        min: 0,
        tooltip: (
          <>
            <p>
              Invisibility threshold (0 - 100). Players need at least this much
              perception to see the mob.
            </p>
            <ul>
              <li>
                <strong>0</strong> - always visible (most mobs)
              </li>
              <li>
                <strong>30 - 50</strong> - invisible to most players
              </li>
              <li>
                <strong>70 - 100</strong> - hidden from nearly everyone
              </li>
            </ul>
          </>
        ),
        type: "number",
      },
      {
        key: "vision",
        label: "Vision Bonus",
        max: 100,
        min: -100,
        tooltip: (
          <>
            <p>
              Modifier (-100 to +100) added to the mob's ability to see in low
              light. The game adds this to room lighting (0 = pitch black, 25 =
              noon sunlight) plus racial bonuses.
            </p>
            <p>Recommended values:</p>
            <ul>
              <li>
                <strong>0</strong> → normal vision (most mobs)
              </li>
              <li>
                <strong>5 - 15</strong> → keen sight (elves, nocturnal hunters)
              </li>
              <li>
                <strong>20 - 25</strong> → excellent dark vision (drow, shadow
                creatures)
              </li>
              <li>
                <strong>-5 to -10</strong> → poor vision (blind cave dwellers)
              </li>
            </ul>
            <p>
              Only set this for mobs that should see better or worse in darkness
              than their race normally allows.
            </p>
          </>
        ),
        type: "number",
      },
    ],
    title: "Economy & Limits",
  },
  {
    fields: [
      {
        key: "local_sound",
        label: "Local Sound",
        tooltip: (
          <p>
            Ambient message shown periodically in the mob's room while idle.
            Plain text only. Example: "The guard shifts his weight restlessly."
          </p>
        ),
        type: "textarea",
      },
      {
        key: "adjacent_sound",
        label: "Adjacent Sound",
        tooltip: (
          <p>
            Ambient message shown periodically in rooms adjacent to the mob
            while idle. Used for sounds that carry through walls. Example: "You
            hear heavy footsteps nearby."
          </p>
        ),
        type: "textarea",
      },
    ],
    title: "Sounds",
    tooltip: (
      <p>
        Periodic ambient messages that play while the mob is idle. Both fields
        are optional. If only Local Sound is set, it plays in the mob's room. If
        both are set, each plays in its respective area.
      </p>
    ),
  },
  {
    fields: [
      {
        enumEntries: CLASS_TYPES,
        key: "class",
        label: "Class",
        tooltip: "",
        type: "enum",
      },
      {
        enumEntries: MOB_SPEC_PROCS,
        key: "spec_proc",
        label: "Special Proc",
        tooltip: (
          <p>
            Optional special procedure for unique behavior that triggers in
            response to various events.
          </p>
        ),
        type: "enum",
      },
      {
        enumEntries: FACTION_TYPES,
        key: "faction",
        label: "Faction",
        tooltip: (
          <>
            <p>
              Which of the three factions this mob belongs to: Brotherhood of
              Galek, Cult of Logrus, or Order of the Serpents. Factions are
              currently disabled globally, but faction type still has active
              effects:
            </p>
            <ul>
              <li>
                <strong>Protector/Protectee AI</strong> - Protector mobs
                automatically assist same-faction Protectees in combat.
              </li>
              <li>
                <strong>Combat assists</strong> - Mobs use faction when deciding
                whether to join ongoing fights in the room.
              </li>
              <li>
                <strong>Friendship</strong> - Two mobs are considered
                &ldquo;friends&rdquo; if they share both the same race and
                faction, which affects NPC-to-NPC behavior.
              </li>
            </ul>
            <p>
              Certain races expect specific factions (generates LOG_LOW warnings
              if mismatched): Kobold = Logrus, Tytan = Galek, Wood Elf / Dryad /
              Centaur / Satyr = Serpents.
            </p>
          </>
        ),
        type: "enum",
      },
      {
        key: "fact_perc",
        label: "Faction %",
        max: 100,
        min: 0,
        tooltip: (
          <>
            <p>
              Loyalty/alignment value (0-100) representing how strongly this mob
              adheres to its faction. When factions are fully enabled, this
              value acts as a power multiplier for cleric and deikhan prayers,
              affects spell success rolls, and drives piety regeneration rate.
            </p>
            <p>
              <strong>Currently has no gameplay effect.</strong> Factions are
              disabled at compile time, so this value is stored but ignored by
              all gameplay code paths - percModifier() returns a flat 0.75 for
              all mobs regardless of this setting.
            </p>
          </>
        ),
        type: "number",
      },
      {
        enumEntries: DEFAULT_POSITION_TYPES,
        key: "def_position",
        label: "Default Position",
        tooltip: (
          <p>
            The mob loads in this position and returns to it when idle. The long
            description is only shown when the mob is in its default position.
          </p>
        ),
        type: "enum",
      },
    ],
    title: "Behavior",
  },
  {
    fields: [
      {
        bitfieldEntries: MOB_ACTIONS,
        key: "actions",
        label: "",
        type: "bitfield",
      },
    ],
    title: "Action Flags",
    tooltip: (
      <p>
        Behavioral flags that control what the mob does autonomously (wander,
        scavenge, assist allies, etc.) and how the game treats it (sentinel,
        aggressive, etc.).
      </p>
    ),
  },
  {
    fields: [
      {
        bitfieldEntries: MOB_AFFECTS,
        key: "affects",
        label: "",
        type: "bitfield",
      },
    ],
    title: "Affect Flags",
    tooltip: (
      <p>
        Permanent magical effects active on the mob (invisibility, detect
        invisible, sanctuary, fly, etc.). These are always on and do not expire.
      </p>
    ),
  },
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

const MOB_STRING_LABELS: Record<MobStringKeyword, string> = {
  bamfin: "Enter World",
  bamfout: "Leave World",
  deathcry: "Death Cry",
  movein: "Room Enter",
  moveout: "Room Leave",
  repop: "Respawn",
};

function MobStringsEditor({
  onChange,
  rows,
  vnum,
}: {
  onChange: (rows: MobExtra[]) => void;
  rows: MobExtra[];
  vnum: number;
}) {
  const [pendingRemove, setPendingRemove] = useState<null | number>(null);
  const [rowKeys, setRowKeys] = useState<string[]>(() =>
    rows.map(() => crypto.randomUUID()),
  );
  const [lastRowCount, setLastRowCount] = useState(rows.length);

  if (rows.length !== lastRowCount) {
    setLastRowCount(rows.length);
    if (rows.length > rowKeys.length) {
      const extra = Array.from({ length: rows.length - rowKeys.length }, () =>
        crypto.randomUUID(),
      );
      setRowKeys([...rowKeys, ...extra]);
    } else if (rows.length < rowKeys.length) {
      setRowKeys(rowKeys.slice(0, rows.length));
    }
  }

  const usedKeywords = new Set(rows.map((r) => r.keyword));
  const availableKeywords = mobStringKeywords.filter(
    (k) => !usedKeywords.has(k),
  );

  const addRow = () => {
    const keyword = availableKeywords[0];
    if (!keyword) {
      return;
    }
    setRowKeys((prev) => [...prev, crypto.randomUUID()]);
    onChange([...rows, { description: "", keyword, vnum }]);
  };

  const removeRow = (index: number) => {
    setRowKeys((prev) => prev.filter((_, i) => i !== index));
    onChange(rows.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="p-4">
      <legend className="text-foreground text-lg font-semibold">
        Mobile Strings
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground ml-1 inline-flex cursor-help"
              type="button"
            >
              <Info
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
            </button>
          </TooltipTrigger>
          <TooltipContent
            className="max-w-sm text-sm text-wrap"
            sideOffset={5}
          >
            <p className="font-medium">
              Custom messages displayed during mob events.
            </p>
            <ul className="mt-1.5 ml-3 list-disc">
              <li>
                <strong>Enter World</strong> - shown when the mob first appears
              </li>
              <li>
                <strong>Leave World</strong> - shown when the mob is removed
              </li>
              <li>
                <strong>Death Cry</strong> - "Your blood freezes..." message on
                death
              </li>
              <li>
                <strong>Respawn</strong> - shown when the mob repopulates
              </li>
              <li>
                <strong>Room Enter</strong> - replaces "X has arrived" when
                entering a room
              </li>
              <li>
                <strong>Room Leave</strong> - replaces "X leaves north" when
                leaving a room
              </li>
            </ul>
          </TooltipContent>
        </Tooltip>
      </legend>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            className="border-border/30 bg-muted/20 space-y-2 rounded border p-3"
            key={rowKeys[index]}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor={`mstr-${index}-keyword`}>Type</Label>
                <Select
                  onValueChange={(v) => {
                    const keyword = mobExtraSchema.shape.keyword.parse(v);
                    onChange(
                      rows.map((r, i) => (i === index ? { ...r, keyword } : r)),
                    );
                  }}
                  value={row.keyword}
                >
                  <SelectTrigger
                    className="w-full"
                    id={`mstr-${index}-keyword`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {mobStringKeywords
                      .filter((k) => k === row.keyword || !usedKeywords.has(k))
                      .map((k) => (
                        <SelectItem
                          key={k}
                          value={k}
                        >
                          {MOB_STRING_LABELS[k]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                aria-label={`Remove ${MOB_STRING_LABELS[row.keyword]} string`}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive mt-5 ml-2 shrink-0"
                onClick={() => {
                  setPendingRemove(index);
                }}
                size="xs"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
            <Label htmlFor={`mstr-${index}-description`}>Message</Label>
            <Textarea
              className="min-h-16 text-base"
              id={`mstr-${index}-description`}
              onChange={(e) => {
                onChange(
                  rows.map((r, i) =>
                    i === index ? { ...r, description: e.target.value } : r,
                  ),
                );
              }}
              value={row.description}
            />
          </div>
        ))}

        <Button
          className="border-dashed"
          disabled={availableKeywords.length === 0}
          onClick={addRow}
          size="sm"
          variant="outline"
        >
          + Add mobile string
        </Button>
      </div>

      <ConfirmDialog
        confirmLabel="Remove"
        message="Remove this mobile string?"
        onCancel={() => {
          setPendingRemove(null);
        }}
        onConfirm={() => {
          if (pendingRemove !== null) {
            removeRow(pendingRemove);
          }
          setPendingRemove(null);
        }}
        open={pendingRemove !== null}
        variant="danger"
      />
    </fieldset>
  );
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
        <Breadcrumbs
          items={[
            { label: "Mobs", to: "/mobs" },
            {
              label: `Mob ${vnum}: ${mob.short_desc || "(unnamed)"}`,
            },
          ]}
        />
        <div className="flex items-center gap-3">
          <h2 className="text-foreground text-xl font-bold">
            Mob {vnum}: {mob.short_desc || "(unnamed)"}
          </h2>
          <Button
            asChild
            size="sm"
            variant="link"
          >
            <Link
              params={{ vnum: vnumParam }}
              to="/mobs/$vnum/responses"
            >
              Edit Responses
            </Link>
          </Button>
        </div>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <MobStringsEditor
            onChange={setExtraEdits}
            rows={extraEdits ?? mob.extras}
            vnum={vnum}
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
        </div>
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
