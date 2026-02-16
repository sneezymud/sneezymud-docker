import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useBlocker,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { FieldDef, FieldGroupDef } from "@/components/entity-form.tsx";
import type { EnumEntry } from "@/shared/enums/types.ts";
import type { Room, RoomExit } from "@/shared/schemas/room.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { useConcurrentEditWarning } from "@/hooks/use-concurrent-edit-warning.ts";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { useSyncDirty } from "@/hooks/use-sync-dirty.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import {
  ROOM_FLAGS,
  ROOM_SPEC_PROCS,
  SECTOR_TYPES,
} from "@/shared/enums/index.ts";
import { roomSchema } from "@/shared/schemas/room.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";
import { toastError } from "@/shared/toast.ts";

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
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        { key: "teletime", label: "Teleport Time", type: "number" },
        { key: "teletarg", label: "Teleport Target", type: "number" },
        {
          help: "0 = show new room desc, 1 = silent",
          key: "telelook",
          label: "Teleport Look",
          type: "number",
        },
      ],
      title: "Teleport",
    },
    {
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          help: "Ticks between river pulses (0 = disabled)",
          key: "river_speed",
          label: "River Speed",
          type: "number",
        },
        {
          help: "Exit direction for river flow (0-5)",
          key: "river_dir",
          label: "River Direction",
          type: "number",
        },
      ],
      title: "River",
    },
    {
      collapsible: true,
      defaultCollapsed: true,
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: room,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/rooms/${String(vnum)}`, roomSchema),
    queryKey: ["room", vnum],
  });

  const { data: zones } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: ["zones"],
  });

  const zoneEntries: EnumEntry[] | undefined = zones?.map((z) => ({
    label: `${String(z.zone_nr)}: ${z.zone_name}`,
    value: z.zone_nr,
  }));

  const [edits, setEdits] = useState<null | Partial<Room>>(null);
  const [exitEdits, setExitEdits] = useState<null | RoomExit[]>(null);

  const dirty = edits !== null || exitEdits !== null;
  useSyncDirty(dirty);
  useConcurrentEditWarning(room, dirty);

  const { proceed, reset, status } = useBlocker({
    enableBeforeUnload: true,
    shouldBlockFn: () => dirty,
    withResolver: true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!room) {
        return null;
      }
      const body: Room = {
        ...room,
        ...edits,
        exits: exitEdits ?? room.exits,
      };
      return apiFetch(`/api/rooms/${String(vnum)}`, roomSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async (saved) => {
      toast.success("Saved");
      if (saved) {
        queryClient.setQueryData(["room", vnum], saved);
      }
      setEdits(null);
      setExitEdits(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["room", vnum] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(
        `/api/rooms/${String(vnum)}`,
        z.object({ ok: z.boolean() }),
        { method: "DELETE" },
      );
    },
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to delete",
      );
    },
    onSuccess: async () => {
      toast.success("Deleted");
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await navigate({ to: "/rooms" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty && !saveMutation.isPending);

  if (isLoading || isError || !room) {
    return (
      <QueryStatus
        backLabel="Rooms"
        backTo="/rooms"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`room ${String(vnum)}`}
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
            { label: `Room ${String(vnum)}: ${room.name || "(unnamed)"}` },
          ]}
        />
        <h2 className="text-xl font-bold text-zinc-100">
          Room {vnum}: {room.name || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete room ${String(vnum)}? This also removes all exits.`}
        deletePending={deleteMutation.isPending}
        dirty={dirty}
        groups={getRoomFieldGroups(zoneEntries)}
        onChange={handleFieldChange}
        onDelete={() => {
          deleteMutation.mutate();
        }}
        onReset={() => {
          setEdits(null);
          setExitEdits(null);
        }}
        onSave={handleSave}
        originalValues={roomToFormValues(room, null)}
        saving={saveMutation.isPending}
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
          reset?.();
        }}
        onConfirm={() => {
          proceed?.();
        }}
        open={status === "blocked"}
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
