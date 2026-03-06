import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { Room, RoomExit, RoomExtra } from "@/shared/schemas/room.ts";
import type { EnumEntry } from "@/shared/types/enums.ts";

import { BackLink } from "@/components/back-link.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { pruneEdits } from "@/lib/prune-edits.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { getRoomFieldGroups } from "@/shared/fields/room-fields.tsx";
import { roomKeys, zoneKeys } from "@/shared/query-keys.ts";
import { roomSchema } from "@/shared/schemas/room.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: RoomEditorPage,
});

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

function applyRoomFieldChange(
  key: string,
  value: number | string,
  room: Room,
  edits: null | Partial<Room>,
  setEdits: React.Dispatch<React.SetStateAction<null | Partial<Room>>>,
) {
  if (key === "height" && typeof value === "number") {
    const indoorsBit = 1 << 3;
    const currentFlags =
      typeof edits?.room_flag === "number" ? edits.room_flag : room.room_flag;
    if (value === -1) {
      // Outdoor: clear INDOORS bit
      setEdits((prev) =>
        pruneEdits(
          { ...prev, height: value, room_flag: currentFlags & ~indoorsBit },
          room,
        ),
      );
    } else if (value >= 1 && value <= 1000) {
      // Indoor: set INDOORS bit
      setEdits((prev) =>
        pruneEdits(
          { ...prev, height: value, room_flag: currentFlags | indoorsBit },
          room,
        ),
      );
    } else {
      setEdits((prev) => pruneEdits({ ...prev, [key]: value }, room));
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
      setEdits((prev) =>
        pruneEdits({ ...prev, height: 100, room_flag: value }, room),
      );
    } else if (wasIndoors && !isIndoors) {
      // Toggled INDOORS off: set height to -1
      setEdits((prev) =>
        pruneEdits({ ...prev, height: -1, room_flag: value }, room),
      );
    } else {
      setEdits((prev) => pruneEdits({ ...prev, [key]: value }, room));
    }
    return;
  }

  setEdits((prev) => pruneEdits({ ...prev, [key]: value }, room));
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

  const resetEdits = () => {
    setEdits(null);
    setExitEdits(null);
    setExtraEdits(null);
  };

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
    onReset: resetEdits,
    saveFn: async () => {
      if (!room) return null;
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
    applyRoomFieldChange(key, value, room, edits, setEdits);
  };

  return (
    <>
      <EntityHeader
        before={
          <BackLink
            title="Back to rooms"
            to="/rooms"
          />
        }
        breadcrumbs={[
          { label: "Rooms", to: "/rooms" },
          { label: `Room ${vnum}: ${room.name || "(unnamed)"}` },
        ]}
        deleteMessage={`Are you sure you want to delete room ${vnum}? This also removes all exits.`}
        deletePending={deletePending}
        dirty={dirty}
        onDelete={handleDelete}
        onReset={resetEdits}
        onSave={handleSave}
        saving={saving}
      />

      <EntityForm
        groups={getRoomFieldGroups(zoneEntries, zonesError, user?.powers ?? [])}
        onChange={handleFieldChange}
        originalValues={roomToFormValues(room, null)}
        values={currentValues}
      >
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
          <RoomExits
            exits={exitEdits ?? room.exits}
            onChange={setExitEdits}
            vnum={vnum}
          />

          <SubTable
            columns={extraDescColumns}
            emptyRow={{ description: "", name: "", vnum }}
            help="Extra descriptions for 'look <keyword>' in-game. Keywords are space-separated."
            label="Extra Descriptions"
            onChange={setExtraEdits}
            rows={extraEdits ?? room.extras}
          />
        </div>
      </EntityForm>

      <UnsavedChangesDialog
        blockerProceed={blockerProceed}
        blockerReset={blockerReset}
        blockerStatus={blockerStatus}
      />
    </>
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

const extraDescColumns = [
  {
    key: "name" as const,
    label: "Keywords",
    type: "text" as const,
    width: "1fr",
  },
  {
    key: "description" as const,
    label: "Description",
    type: "textarea" as const,
    width: "2fr",
  },
];
