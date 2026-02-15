import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { Room, RoomExit } from "@/shared/schemas/room.ts";

import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { ROOM_FLAGS, SECTOR_TYPES } from "@/shared/enums/index.ts";
import { roomSchema } from "@/shared/schemas/room.ts";

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: RoomEditorPage,
});

const roomFieldGroups: FieldGroupDef[] = [
  {
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    title: "Identity",
  },
  {
    fields: [
      {
        help: "Area this room belongs to",
        key: "zone",
        label: "Zone",
        type: "number",
      },
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
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "height", label: "Height", type: "number" },
      { key: "spec", label: "Special Proc", type: "number" },
    ],
    title: "Properties",
  },
  {
    fields: [
      { key: "teletime", label: "Teleport Time", type: "number" },
      { key: "teletarg", label: "Teleport Target", type: "number" },
      { key: "telelook", label: "Teleport Look", type: "number" },
    ],
    title: "Teleport",
  },
  {
    fields: [
      { key: "river_speed", label: "River Speed", type: "number" },
      { key: "river_dir", label: "River Direction", type: "number" },
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

function RoomEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
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

  const [edits, setEdits] = useState<null | Partial<Room>>(null);
  const [exitEdits, setExitEdits] = useState<null | RoomExit[]>(null);

  const dirty = edits !== null || exitEdits !== null;

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!room) {
        return;
      }
      const body: Room = {
        ...room,
        ...edits,
        exits: exitEdits ?? room.exits,
      };
      await apiFetch(`/api/rooms/${String(vnum)}`, roomSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async () => {
      setEdits(null);
      setExitEdits(null);
      toast.success("Saved");
      await queryClient.invalidateQueries({ queryKey: ["room", vnum] });
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
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
      toast.error(
        err instanceof ApiResponseError ? err.message : "Failed to delete",
      );
    },
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await navigate({ to: "/rooms" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty);

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
      <div className="mb-4 flex items-center gap-3">
        <button
          className="text-sm text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            void navigate({ to: "/rooms" });
          }}
          type="button"
        >
          &larr; Rooms
        </button>
        <h2 className="text-lg font-semibold text-zinc-100">
          Room {vnum}: {room.name || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete room ${String(vnum)}? This also removes all exits.`}
        dirty={dirty}
        groups={roomFieldGroups}
        onChange={handleFieldChange}
        onDelete={() => {
          deleteMutation.mutate();
        }}
        onSave={handleSave}
        saving={saveMutation.isPending}
        values={currentValues}
      >
        <RoomExits
          exits={exitEdits ?? room.exits}
          onChange={handleExitChange}
          vnum={vnum}
        />
      </EntityForm>
    </div>
  );
}
