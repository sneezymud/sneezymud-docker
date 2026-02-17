import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { EntityList } from "@/components/entity-list.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { mobKeys } from "@/shared/query-keys.ts";
import { mobListSchema, mobSchema } from "@/shared/schemas/mob.ts";
import { toastError } from "@/shared/toast.ts";
import { useAuthStore } from "@/state/auth.ts";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/mobs/")({
  component: MobListPage,
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : emptySearch;
  },
});

function MobListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const blocks = useAuthStore((s) => s.user?.blocks);
  const { from, to } = Route.useSearch();

  const {
    data: mobs,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/mobs", mobListSchema),
    queryKey: mobKeys.all,
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/mobs", mobSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to create mob",
      );
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: mobKeys.all });
      await navigate({ to: `/mobs/${data.vnum}` });
    },
  });

  if (isLoading || isError || !mobs) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="mobs"
      />
    );
  }

  const entities = mobs.map((m) => ({
    name: m.short_desc || m.name,
    secondary: m.name,
    vnum: m.vnum,
  }));

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  return (
    <div>
      {from !== undefined && to !== undefined ? (
        <div className="mb-4 flex items-center gap-2 rounded border border-zinc-700/50 bg-zinc-800/30 px-4 py-2 text-sm text-zinc-400">
          <span>
            Filtered to zone range {from}&ndash;{to}
          </span>
          <button
            className="text-xs text-zinc-400 underline hover:text-zinc-200"
            onClick={() => {
              void navigate({ search: {}, to: "/mobs" });
            }}
            type="button"
          >
            Clear filter
          </button>
        </div>
      ) : null}
      <EntityList
        basePath="/mobs"
        createPending={createMutation.isPending}
        entities={filtered}
        label="Mobs"
        onCreateVnum={(vnum) => {
          createMutation.mutate(vnum);
        }}
        secondaryLabel="Keywords"
        vnumBlocks={blocks}
      />
    </div>
  );
}
