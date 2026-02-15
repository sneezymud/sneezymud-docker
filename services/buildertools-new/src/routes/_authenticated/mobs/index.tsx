import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EntityList } from "@/components/entity-list.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { mobListSchema, mobSchema } from "@/shared/schemas/mob.ts";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/_authenticated/mobs/")({
  component: MobListPage,
});

function MobListPage() {
  const queryClient = useQueryClient();
  const blocks = useAuthStore((s) => s.user?.blocks);

  const { data: mobs } = useQuery({
    queryFn: () => apiFetch("/api/mobs", mobListSchema),
    queryKey: ["mobs"],
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/mobs", mobSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mobs"] });
    },
  });

  return (
    <EntityList
      basePath="/mobs"
      entities={mobs ?? []}
      label="Mobs"
      onCreateVnum={(vnum) => {
        createMutation.mutate(vnum);
      }}
      vnumBlocks={blocks}
    />
  );
}
