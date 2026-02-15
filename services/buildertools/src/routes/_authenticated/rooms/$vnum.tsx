import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { Room, RoomExit } from "@/shared/schemas/room.ts";

import { EntityForm } from "@/components/entity-form.tsx";
import { RoomExits } from "@/components/room-exits.tsx";
import { apiFetch } from "@/shared/api-client.ts";
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
        help: "Bitfield for room properties",
        key: "room_flag",
        label: "Room Flags",
        type: "number",
      },
      {
        help: "Terrain type (0=indoor, 1=city, etc.)",
        key: "sector",
        label: "Sector Type",
        type: "number",
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

  const { data: room, isLoading } = useQuery({
    queryFn: () => apiFetch(`/api/rooms/${String(vnum)}`, roomSchema),
    queryKey: ["room", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Room>>(null);
  const [exitEdits, setExitEdits] = useState<null | RoomExit[]>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dirty = edits !== null || exitEdits !== null;

  // Warn on tab close with unsaved changes
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
    onSuccess: async () => {
      setEdits(null);
      setExitEdits(null);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await navigate({ to: "/rooms" });
    },
  });

  if (isLoading || !room) {
    return <p className="text-sm text-zinc-500">Loading room {vnum}...</p>;
  }

  const currentValues = roomToFormValues(room, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleExitChange = (exits: RoomExit[]) => {
    setExitEdits(exits);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
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
        dirty={dirty}
        groups={roomFieldGroups}
        onChange={handleFieldChange}
        onDelete={handleDelete}
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

      {showDeleteConfirm && !deleteMutation.isPending ? (
        <div className="mt-4 rounded border border-red-800/50 bg-red-900/10 p-4">
          <p className="mb-3 text-sm text-red-400">
            Are you sure you want to delete room {vnum}? This also removes all
            exits.
          </p>
          <div className="flex gap-2">
            <button
              className="rounded bg-red-800 px-3 py-1.5 text-sm text-red-100 hover:bg-red-700"
              onClick={() => {
                deleteMutation.mutate();
              }}
              type="button"
            >
              Yes, delete
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setShowDeleteConfirm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
