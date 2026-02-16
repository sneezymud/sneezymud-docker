import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { EntityList } from "@/components/entity-list.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { roomListSchema, roomSchema } from "@/shared/schemas/room.ts";
import { toastError } from "@/shared/toast.ts";
import { useAuthStore } from "@/state/auth.ts";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/rooms/")({
  component: RoomListPage,
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : emptySearch;
  },
});

function RoomListPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { from, to } = Route.useSearch();

  const {
    data: rooms,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/rooms", roomListSchema),
    queryKey: ["rooms"],
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/rooms", roomSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to create room",
      );
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      await navigate({ to: `/rooms/${String(data.vnum)}` });
    },
  });

  if (isLoading || isError || !rooms) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="rooms"
      />
    );
  }

  const filtered =
    from !== undefined && to !== undefined
      ? rooms.filter((r) => r.vnum >= from && r.vnum <= to)
      : rooms;

  return (
    <div>
      {from !== undefined && to !== undefined ? (
        <div className="mb-4 flex items-center gap-2 rounded border border-zinc-700/50 bg-zinc-800/30 px-4 py-2 text-sm text-zinc-400">
          <span>
            Filtered to zone range {String(from)}&ndash;{String(to)}
          </span>
          <button
            className="text-xs text-zinc-400 underline hover:text-zinc-200"
            onClick={() => {
              void navigate({ search: {}, to: "/rooms" });
            }}
            type="button"
          >
            Clear filter
          </button>
        </div>
      ) : null}
      <EntityList
        basePath="/rooms"
        createPending={createMutation.isPending}
        entities={filtered}
        label="Rooms"
        onCreateVnum={(vnum) => {
          createMutation.mutate(vnum);
        }}
        vnumBlocks={user?.blocks}
      />
    </div>
  );
}
