import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { EntityList } from "@/components/entity-list.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { roomListSchema } from "@/shared/schemas/room.ts";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/_authenticated/rooms/")({
  component: RoomListPage,
});

function RoomListPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rooms = [] } = useQuery({
    queryFn: () => apiFetch("/api/rooms", roomListSchema),
    queryKey: ["rooms"],
  });

  const createMutation = useMutation({
    mutationFn: async (vnum: number) => {
      const result = await apiFetch(
        "/api/rooms",
        z.object({ vnum: z.number() }),
        {
          body: JSON.stringify({ vnum }),
          method: "POST",
        },
      );
      return result;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await navigate({ to: `/rooms/${String(data.vnum)}` });
    },
  });

  return (
    <EntityList
      basePath="/rooms"
      entities={rooms}
      label="Rooms"
      onCreateVnum={(vnum) => {
        createMutation.mutate(vnum);
      }}
      vnumBlocks={user?.blocks}
    />
  );
}
