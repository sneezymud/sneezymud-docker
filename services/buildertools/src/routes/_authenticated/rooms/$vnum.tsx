import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { FieldDef, FieldGroupDef } from "@/components/entity-form.tsx";
import type { EnumEntry } from "@/shared/enums/types.ts";
import type { Room, RoomExit } from "@/shared/schemas/room.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  ROOM_FLAGS,
  ROOM_SPEC_PROCS,
  SECTOR_TYPES,
} from "@/shared/enums/index.ts";
import { roomKeys, zoneKeys } from "@/shared/query-keys.ts";
import { roomSchema } from "@/shared/schemas/room.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: RoomEditorPage,
});

function buildZoneField(zoneEntries: EnumEntry[] | undefined): FieldDef {
  if (zoneEntries && zoneEntries.length > 0) {
    return {
      enumEntries: zoneEntries,
      key: "zone",
      label: "Zone",
      type: "enum",
    };
  }
  return {
    help: "Area this room belongs to",
    key: "zone",
    label: "Zone",
    type: "number",
  };
}

function getRoomFieldGroups(
  zoneEntries: EnumEntry[] | undefined,
): FieldGroupDef[] {
  return [
    {
      fields: [
        { key: "name", label: "Name", required: true, type: "text" },
        {
          key: "description",
          label: "Description",
          required: true,
          type: "textarea",
        },
      ],
      title: "Identity",
    },
    {
      fields: [
        buildZoneField(zoneEntries),
        {
          bitfieldEntries: ROOM_FLAGS,
          key: "room_flag",
          label: "Room Flags",
          type: "bitfield",
        },
        {
          enumEntries: SECTOR_TYPES,
          key: "sector",
          label: "Sector Type",
          type: "enum",
        },
        {
          help: "Max people allowed in room (0 = unlimited)",
          key: "capacity",
          label: "Capacity",
          type: "number",
        },
        {
          help: "Room height in feet (affects flying, etc.)",
          key: "height",
          label: "Height",
          type: "number",
        },
        {
          enumEntries: ROOM_SPEC_PROCS,
          help: "Special procedure ID (0 = none)",
          key: "spec",
          label: "Special Proc",
          type: "enum",
        },
      ],
      title: "Properties",
    },
    {
      fields: [
        { key: "teletime", label: "Teleport Time", type: "number" },
        { key: "teletarg", label: "Teleport Target", type: "number" },
        {
          enumEntries: [
            { label: "Show room description", value: 0 },
            { label: "Silent", value: 1 },
          ],
          key: "telelook",
          label: "Teleport Look",
          type: "enum",
        },
      ],
      title: "Teleport",
    },
    {
      fields: [
        {
          help: "Ticks between river pulses (0 = disabled)",
          key: "river_speed",
          label: "River Speed",
          type: "number",
        },
        {
          enumEntries: [
            { label: "North", value: 0 },
            { label: "East", value: 1 },
            { label: "South", value: 2 },
            { label: "West", value: 3 },
            { label: "Up", value: 4 },
            { label: "Down", value: 5 },
          ],
          key: "river_dir",
          label: "River Direction",
          type: "enum",
        },
      ],
      title: "River",
    },
    {
      fields: [
        { key: "x", label: "X", type: "number" },
        { key: "y", label: "Y", type: "number" },
        { key: "z", label: "Z", type: "number" },
      ],
      title: "Coordinates",
    },
  ];
}

function roomToFormValues(
  room: Room,
  edits: null | Partial<Room>,
): Record<string, number | string> {
  const { exits: _roomExits, ...roomFields } = room;
  if (!edits) {
    return roomFields;
  }
  const { exits: _editExits, ...editFields } = edits;
  return { ...roomFields, ...editFields };
}

function RoomEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);

  const {
    data: room,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/rooms/${vnum}`, roomSchema),
    queryKey: roomKeys.detail(vnum),
  });

  const { data: zones } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: zoneKeys.all,
  });

  const zoneEntries: EnumEntry[] | undefined = zones?.map((zn) => ({
    label: `${zn.zone_nr}: ${zn.zone_name}`,
    value: zn.zone_nr,
  }));

  const [edits, setEdits] = useState<null | Partial<Room>>(null);
  const [exitEdits, setExitEdits] = useState<null | RoomExit[]>(null);

  const dirty = edits !== null || exitEdits !== null;

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
    },
    saveFn: async () => {
      if (!room) {
        return null;
      }
      const body: Room = {
        ...room,
        ...edits,
        exits: exitEdits ?? room.exits,
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
        groups={getRoomFieldGroups(zoneEntries)}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onReset={() => {
          setEdits(null);
          setExitEdits(null);
        }}
        onSave={handleSave}
        originalValues={roomToFormValues(room, null)}
        saving={saving}
        values={currentValues}
      >
        <RoomExits
          exits={exitEdits ?? room.exits}
          onChange={handleExitChange}
          vnum={vnum}
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

function RoomEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <RoomEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
