import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { EntityList } from "@/components/entity-list.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { Alert, AlertDescription } from "@/components/ui/alert.tsx";
import { Button } from "@/components/ui/button.tsx";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { objectKeys } from "@/shared/query-keys.ts";
import { objListSchema, objSchema } from "@/shared/schemas/obj.ts";
import { toastError } from "@/shared/toast.ts";
import { useAuthStore } from "@/state/auth.ts";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/objects/")({
  component: ObjectListPage,
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : emptySearch;
  },
});

function ObjectListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const blocks = useAuthStore((s) => s.user?.blocks);
  const { from, to } = Route.useSearch();

  const {
    data: objects,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch("/api/objects", objListSchema),
    queryKey: objectKeys.all,
  });

  const createMutation = useMutation({
    mutationFn: (vnum: number) =>
      apiFetch("/api/objects", objSchema, {
        body: JSON.stringify({ vnum }),
        method: "POST",
      }),
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError
          ? err.message
          : "Failed to create object",
      );
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: objectKeys.all });
      await navigate({ to: `/objects/${data.vnum}` });
    },
  });

  if (isLoading || isError || !objects) {
    return (
      <QueryStatus
        error={error}
        isError={isError}
        isLoading={isLoading}
        label="objects"
      />
    );
  }

  const entities = objects.map((o) => ({
    name: o.short_desc || o.name,
    secondary: o.name,
    vnum: o.vnum,
  }));

  const filtered =
    from !== undefined && to !== undefined
      ? entities.filter((e) => e.vnum >= from && e.vnum <= to)
      : entities;

  return (
    <div>
      {from !== undefined && to !== undefined ? (
        <Alert className="mb-4">
          <AlertDescription className="flex items-center gap-2">
            Filtered to zone range {from}&ndash;{to}
            <Button
              onClick={() => {
                void navigate({ search: {}, to: "/objects" });
              }}
              size="xs"
              variant="link"
            >
              Clear filter
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      <EntityList
        basePath="/objects"
        createPending={createMutation.isPending}
        entities={filtered}
        label="Objects"
        onCreateVnum={(vnum) => {
          createMutation.mutate(vnum);
        }}
        secondaryLabel="Keywords"
        vnumBlocks={blocks}
      />
    </div>
  );
}
