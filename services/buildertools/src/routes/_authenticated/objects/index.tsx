import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { EntityList } from "@/components/entity-list.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { objListSchema, objSchema } from "@/shared/schemas/obj.ts";
import { useAuthStore } from "@/state/auth.ts";

export const Route = createFileRoute("/_authenticated/objects/")({
  component: ObjectListPage,
});

function ObjectListPage() {
  const queryClient = useQueryClient();
  const blocks = useAuthStore((s) => s.user?.blocks);

  const { data: objects } = useQuery({
    queryFn: () => apiFetch("/api/objects", objListSchema),
    queryKey: ["objects"],
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/objects", objSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["objects"] });
    },
  });

  return (
    <EntityList
      basePath="/objects"
      entities={objects ?? []}
      label="Objects"
      onCreateVnum={(vnum) => {
        createMutation.mutate(vnum);
      }}
      vnumBlocks={blocks}
    />
  );
}
