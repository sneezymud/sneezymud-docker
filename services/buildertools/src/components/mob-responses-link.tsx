import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { canonicalOwner, entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";
import { useAuthStore } from "@/state/auth.ts";

export function MobResponsesLink({
  owner,
  vnum,
}: {
  owner: number | undefined;
  vnum: number;
}) {
  const user = useAuthStore((s) => s.user);
  const cOwner = canonicalOwner(owner, user?.playerId ?? 0);
  const { data, isLoading } = useQuery({
    queryFn: () =>
      apiFetch(
        `/api/mob-responses/${vnum}${ownerSuffix(cOwner)}`,
        mobResponseSchema,
      ),
    queryKey: entityKeys.detail("mob-response", vnum, cOwner),
  });

  if (isLoading) {
    return <Skeleton className="mb-2 h-8 w-40" />;
  }

  const label = data?.response.trim()
    ? "Edit Mob Responses"
    : "Add Mob Response";

  return (
    <Button
      asChild
      className="mb-2"
      size="sm"
      variant="link"
    >
      <Link
        params={{ vnum: vnum.toString() }}
        to="/mobs/$vnum/responses"
        {...(owner !== undefined && { search: { owner } })}
      >
        {label}
      </Link>
    </Button>
  );
}
