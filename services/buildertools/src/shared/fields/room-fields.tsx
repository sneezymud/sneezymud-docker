import type { FieldDef, FieldGroupDef } from "@/shared/types/entity-form.ts";
import type { EnumEntry } from "@/shared/types/enums.ts";

import {
  DIRECTION_TYPES,
  ROOM_FLAGS,
  ROOM_SPEC_PROCS,
  SECTOR_TYPES,
} from "@/shared/enums/index.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import {
  gateSpecProcs,
  isUnassignableRoomSpecProc,
} from "@/shared/spec-proc-access.ts";

export function buildZoneField(
  zoneEntries: EnumEntry[] | undefined,
  zonesError: boolean,
): FieldDef {
  const tooltip = (
    <p>
      The zone this room belongs to, determined by vnum range. Zones control
      reset behavior (mob/object repopulation) and are managed in-game.
      Read-only here.
    </p>
  );
  if (zoneEntries && zoneEntries.length > 0) {
    return {
      enumEntries: zoneEntries,
      key: "zone",
      label: "Zone",
      readOnly: true,
      tooltip,
      type: "enum",
    };
  }
  const base: FieldDef = {
    key: "zone",
    label: "Zone",
    readOnly: true,
    tooltip,
    type: "number",
  };
  if (zonesError) base.help = "Zone names unavailable";
  return base;
}

export function getRoomFieldGroups(
  zoneEntries: EnumEntry[] | undefined,
  zonesError: boolean,
  powers: number[],
): FieldGroupDef[] {
  return [
    {
      defaultExpanded: true,
      fields: [
        {
          fullWidth: true,
          key: "name",
          label: "Name",
          required: true,
          tooltip: (
            <p>
              Short room title shown in the room header and on the in-game map.
              Should be a noun phrase describing the location (e.g., "A Dusty
              Corridor", "The Town Square").
            </p>
          ),
          type: "text",
        },
        {
          key: "description",
          label: "Description",
          required: true,
          tooltip: (
            <p>
              Full room description shown when a player enters or looks.
              Describe what the character sees, hears, and smells. Write in
              second person present tense. Keep to 3 - 5 sentences.
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
        buildZoneField(zoneEntries, zonesError),
        {
          detailedTooltip: (
            <>
              <p>
                Determines terrain type, movement cost, weather exposure, and
                swim/fly requirements.
              </p>

              <p>
                <strong>Climate groups:</strong>
              </p>

              <ul>
                <li>
                  <strong>Arctic (0-16):</strong> Cold climate terrain. Affects
                  weather, foraging, and exposure mechanics.
                </li>

                <li>
                  <strong>Temperate (20-36):</strong> Moderate climate terrain.
                  The most common group for indoor areas and towns.
                </li>

                <li>
                  <strong>Tropical (40-59):</strong> Hot climate terrain.
                  Includes deserts, jungles, and volcanic areas.
                </li>

                <li>
                  <strong>Special (60-66):</strong> Non-standard terrain for
                  unique areas (astral, inside mobs, etc.).
                </li>
              </ul>

              <p>
                <strong>Key gameplay effects:</strong>
              </p>

              <ul>
                <li>
                  <strong>Water sectors</strong> (Ocean, River Surface) require
                  swimming or a boat. Underwater requires waterbreath.
                </li>

                <li>
                  <strong>Air/Atmosphere sectors</strong> require flying;
                  levitate is not sufficient.
                </li>

                <li>
                  <strong>Building/Cave sectors</strong> are naturally indoor
                  terrain.
                </li>

                <li>
                  <strong>Road sectors</strong> have reduced movement cost for
                  faster travel.
                </li>

                <li>
                  <strong>Mountain/Climbing sectors</strong> have increased
                  movement cost and may require climbing skill.
                </li>
              </ul>

              <p>
                <strong>New rooms</strong> default to Astral Ethereal (60).
                Change this to match the area's climate and terrain.
              </p>
            </>
          ),
          enumEntries: SECTOR_TYPES,
          key: "sector",
          label: "Sector Type",
          tooltip: (
            <p>
              Determines terrain type, movement cost, weather exposure, and
              swim/fly requirements.
            </p>
          ),
          type: "enum",
        },
        {
          key: "capacity",
          label: "Max Capacity",
          max: 100,
          min: 0,
          tooltip: (
            <p>
              Maximum number of characters allowed in the room simultaneously. 0
              = unlimited. Excess characters are blocked from entering. Use for
              narrow passages, small rooms, or throne rooms.
            </p>
          ),
          type: "number",
        },
        {
          detailedTooltip: (
            <>
              <p>
                Room height determines ceiling effects for beings inside the
                room.
              </p>

              <p>
                <strong>Outdoor rooms</strong> (height = -1): No ceiling at all.
                No bump damage, no combat penalties, full throwing range.
              </p>

              <p>
                <strong>Indoor rooms</strong> (height 1-1000, in inches):
                Ceiling effects apply when a being's effective height exceeds
                the room height:
              </p>

              <ul>
                <li>
                  <strong>Movement:</strong> Beings taller than an exit take 1-3
                  bump damage. If much taller, they are completely blocked and
                  must crawl.
                </li>

                <li>
                  <strong>Periodic bump damage:</strong> Beings taller than the
                  room take periodic damage while standing in it.
                </li>

                <li>
                  <strong>Combat penalty:</strong> Tall beings in low rooms
                  occasionally lose attack swings unless they have Close
                  Quarters Fighting.
                </li>

                <li>
                  <strong>Thrown weapon range:</strong> A ceiling limits the
                  maximum throw arc, reducing range.
                </li>

                <li>
                  <strong>Charge:</strong> Charging through a too-low exit deals
                  20-40 damage and stops the charge.
                </li>

                <li>
                  <strong>Doorbash:</strong> Bashing a door in a too-low exit
                  causes the basher to slam into the wall above.
                </li>
              </ul>

              <p>
                <strong>Default:</strong> -1 (outdoor). Setting 1-1000 auto-sets
                the INDOORS flag; setting -1 auto-clears it.
              </p>

              <p>
                <strong>Note:</strong> Do not set height to 0. Use -1 for
                unlimited (outdoor).
              </p>
            </>
          ),
          help: "Ceiling height in inches. -1 = unlimited (outdoor). 1-1000 = indoor.",
          key: "height",
          label: "Room Height",
          max: 1000,
          min: -1,
          type: "number",
        },
        {
          enumEntries: hasPower(powers, POWER.REDIT_ENABLED)
            ? ROOM_SPEC_PROCS
            : gateSpecProcs(ROOM_SPEC_PROCS, isUnassignableRoomSpecProc),
          key: "spec",
          label: "Room Spec",
          tooltip: (
            <p>
              Optional special procedure for unique room behavior (shops,
              guilds, banks, etc.). Most rooms use None.
            </p>
          ),
          type: "enum",
        },
      ],
      title: "Properties",
    },
    {
      defaultExpanded: false,
      fields: [
        {
          bitfieldEntries: ROOM_FLAGS,
          key: "room_flag",
          label: "",
          type: "bitfield",
        },
      ],
      title: "Room Flags",
      tooltip: (
        <p>
          Room behavior flags that restrict or modify what players can do here
          (e.g., no combat, no magic, no flee). INDOORS is auto-managed by Room
          Height.
        </p>
      ),
    },
    {
      defaultExpanded: false,
      fields: [
        {
          help: "Teleport period in game ticks (12 ticks \u2248 1.2 seconds). 0 = disabled.",
          key: "teletime",
          label: "Teleport Time",
          type: "number",
        },
        {
          help: "Destination room vnum. 0 = disabled. Set to this room's own vnum for echo-only mode.",
          key: "teletarg",
          label: "Teleport Target",
          type: "room",
        },
        {
          enumEntries: [
            { label: "No Auto-Look (Silent)", value: 0 },
            { label: "Auto-Look at Destination", value: 1 },
          ],
          help: "Controls whether teleported characters automatically see the destination room description. 'Silent' is useful for narrative teleports where an extra description provides the text.",
          key: "telelook",
          label: "Teleport Look",
          type: "enum",
        },
      ],
      title: "Teleport",
      tooltip: (
        <p>
          Teleport rooms periodically transport all characters and objects to a
          destination room on a timer. Immortals are immune. Set target to this
          room's own vnum for echo-only mode (shows _tele_ extra description
          text without moving).
        </p>
      ),
    },
    {
      defaultExpanded: false,
      fields: [
        {
          help: "Current strength (0 = still water). Only affects water/underwater sector rooms.",
          key: "river_speed",
          label: "River Speed",
          tooltip: (
            <>
              <p>
                Despite the name, higher values do NOT mean faster current.{" "}
                <strong>river_speed</strong> controls two things:
              </p>

              <ul>
                <li>
                  <strong>Flow frequency:</strong> Higher speed = less frequent
                  sweeping.
                </li>

                <li>
                  <strong>Swimming difficulty:</strong> Higher speed adds more
                  drag weight, making it harder to resist. Swimming with the
                  current is easier; against it is harder.
                </li>
              </ul>

              <p>
                Only affects swimming characters (not flying, levitating,
                mounted, or in a boat).
              </p>
            </>
          ),
          type: "number",
        },
        {
          enumEntries: [{ label: "None", value: -1 }, ...DIRECTION_TYPES],
          key: "river_dir",
          label: "River Direction",
          tooltip: (
            <p>
              Direction the current pushes swimmers. Must have a valid exit in
              this direction or the current has no effect.
            </p>
          ),
          type: "enum",
        },
      ],
      title: "River",
      tooltip: (
        <p>
          River settings create water currents that push swimming characters in
          a direction. Only affects rooms with water/underwater sector types.
          Characters who are flying, levitating, mounted, or in a boat are
          unaffected.
        </p>
      ),
    },
  ];
}
