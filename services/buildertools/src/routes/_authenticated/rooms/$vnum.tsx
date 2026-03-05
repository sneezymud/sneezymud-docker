import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { FieldDef, FieldGroupDef } from "@/components/entity-form.tsx";
import type { EnumEntry } from "@/shared/enums/types.ts";
import type { Room, RoomExit, RoomExtra } from "@/shared/schemas/room.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  DIRECTION_TYPES,
  ROOM_FLAGS,
  ROOM_SPEC_PROCS,
  SECTOR_TYPES,
} from "@/shared/enums/index.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import { roomKeys, zoneKeys } from "@/shared/query-keys.ts";
import { roomSchema } from "@/shared/schemas/room.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";
import {
  gateSpecProcs,
  isUnassignableRoomSpecProc,
} from "@/shared/spec-proc-access.ts";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: RoomEditorPage,
});

function buildZoneField(
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

function getRoomFieldGroups(
  zoneEntries: EnumEntry[] | undefined,
  zonesError: boolean,
  powers: number[],
): FieldGroupDef[] {
  return [
    {
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
    {
      fields: [
        { key: "x", label: "X", readOnly: true, type: "number" },
        { key: "y", label: "Y", readOnly: true, type: "number" },
        { key: "z", label: "Z", readOnly: true, type: "number" },
      ],
      title: "Coordinates",
      tooltip: (
        <>
          <p>
            Coordinates are auto-calculated from room exit topology and used by
            the in-game map system. They are set when rooms are created via
            exits and can be recalculated with the <strong>map recalc</strong>{" "}
            in-game command.
          </p>
          <ul>
            <li>
              <strong>X:</strong> East-West position (increases going East)
            </li>
            <li>
              <strong>Y:</strong> North-South position (increases going North)
            </li>
            <li>
              <strong>Z:</strong> Vertical position (increases going Up)
            </li>
          </ul>
        </>
      ),
    },
  ];
}

function roomToFormValues(
  room: Room,
  edits: null | Partial<Room>,
): Record<string, number | string> {
  const { exits: _roomExits, extras: _roomExtras, ...roomFields } = room;
  if (!edits) {
    return roomFields;
  }
  const { exits: _editExits, extras: _editExtras, ...editFields } = edits;
  return { ...roomFields, ...editFields };
}

function RoomEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);

  const {
    data: room,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/rooms/${vnum}`, roomSchema),
    queryKey: roomKeys.detail(vnum),
  });

  const { data: zones, isError: zonesError } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: zoneKeys.all,
  });

  const zoneEntries: EnumEntry[] | undefined = zones?.map((zn) => ({
    label: `${zn.zone_nr}: ${zn.zone_name}`,
    value: zn.zone_nr,
  }));

  const [edits, setEdits] = useState<null | Partial<Room>>(null);
  const [exitEdits, setExitEdits] = useState<null | RoomExit[]>(null);
  const [extraEdits, setExtraEdits] = useState<null | RoomExtra[]>(null);

  const dirty = edits !== null || exitEdits !== null || extraEdits !== null;

  const {
    blockerProceed,
    blockerReset,
    blockerStatus,
    deletePending,
    handleDelete,
    handleSave,
    saving,
  } = useEntityEditor({
    allKey: roomKeys.all,
    data: room,
    deletePath: `/api/rooms/${vnum}`,
    detailKey: roomKeys.detail(vnum),
    dirty,
    listPath: "/rooms",
    onReset: () => {
      setEdits(null);
      setExitEdits(null);
      setExtraEdits(null);
    },
    saveFn: async () => {
      if (!room) {
        return null;
      }
      const body: Room = {
        ...room,
        ...edits,
        exits: exitEdits ?? room.exits,
        extras: extraEdits ?? room.extras,
      };
      return apiFetch(`/api/rooms/${vnum}`, roomSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
  });

  if (isLoading || isError || !room) {
    return (
      <QueryStatus
        backLabel="Rooms"
        backTo="/rooms"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`room ${vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  const currentValues = roomToFormValues(room, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    if (key === "height" && typeof value === "number") {
      const indoorsBit = 1 << 3;
      const currentFlags =
        typeof edits?.room_flag === "number" ? edits.room_flag : room.room_flag;
      if (value === -1) {
        // Outdoor: clear INDOORS bit
        setEdits((prev) => ({
          ...prev,
          height: value,
          room_flag: currentFlags & ~indoorsBit,
        }));
      } else if (value >= 1 && value <= 1000) {
        // Indoor: set INDOORS bit
        setEdits((prev) => ({
          ...prev,
          height: value,
          room_flag: currentFlags | indoorsBit,
        }));
      } else {
        setEdits((prev) => ({ ...prev, [key]: value }));
      }
      return;
    }

    if (key === "room_flag" && typeof value === "number") {
      const indoorsBit = 1 << 3;
      const currentFlags =
        typeof edits?.room_flag === "number" ? edits.room_flag : room.room_flag;
      const wasIndoors = (currentFlags & indoorsBit) !== 0;
      const isIndoors = (value & indoorsBit) !== 0;
      const currentHeight =
        typeof edits?.height === "number" ? edits.height : room.height;

      if (!wasIndoors && isIndoors && currentHeight === -1) {
        // Toggled INDOORS on while height is unlimited: set height to 100
        setEdits((prev) => ({ ...prev, height: 100, room_flag: value }));
      } else if (wasIndoors && !isIndoors) {
        // Toggled INDOORS off: set height to -1
        setEdits((prev) => ({ ...prev, height: -1, room_flag: value }));
      } else {
        setEdits((prev) => ({ ...prev, [key]: value }));
      }
      return;
    }

    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleExitChange = (exits: RoomExit[]) => {
    setExitEdits(exits);
  };

  return (
    <div>
      <div className="mb-4 space-y-1">
        <Breadcrumbs
          items={[
            { label: "Rooms", to: "/rooms" },
            { label: `Room ${vnum}: ${room.name || "(unnamed)"}` },
          ]}
        />
        <h2 className="text-foreground text-xl font-bold">
          Room {vnum}: {room.name || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete room ${vnum}? This also removes all exits.`}
        deletePending={deletePending}
        dirty={dirty}
        groups={getRoomFieldGroups(zoneEntries, zonesError, user?.powers ?? [])}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onReset={() => {
          setEdits(null);
          setExitEdits(null);
          setExtraEdits(null);
        }}
        onSave={handleSave}
        originalValues={roomToFormValues(room, null)}
        saving={saving}
        values={currentValues}
      >
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <RoomExits
            exits={exitEdits ?? room.exits}
            onChange={handleExitChange}
            vnum={vnum}
          />
          <SubTable
            columns={[
              { key: "name", label: "Keywords", type: "text", width: "1fr" },
              {
                key: "description",
                label: "Description",
                type: "textarea",
                width: "2fr",
              },
            ]}
            emptyRow={{ description: "", name: "", vnum }}
            help="Extra descriptions for 'look <keyword>' in-game. Keywords are space-separated."
            label="Extra Descriptions"
            onChange={setExtraEdits}
            rows={extraEdits ?? room.extras}
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

function RoomEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <RoomEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
