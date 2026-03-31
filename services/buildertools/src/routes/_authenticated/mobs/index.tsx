import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MobList } from "@/components/mob-list";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/mobs/")({
  component: function MobListPage() {
    const { from, to } = Route.useSearch();
    return (
      <MobList
        from={from}
        to={to}
      />
    );
  },
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    return result.success ? result.data : emptySearch;
  },
});
