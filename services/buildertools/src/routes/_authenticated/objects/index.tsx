import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ObjectList } from "@/components/object-list";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/objects/")({
  component: function ObjectListPage() {
    const { from, to } = Route.useSearch();
    return (
      <ObjectList
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
