import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RoomList } from "@/components/room-list";

const searchSchema = z.object({
  from: z.optional(z.number()),
  to: z.optional(z.number()),
});

const emptySearch: z.infer<typeof searchSchema> = {};

export const Route = createFileRoute("/_authenticated/rooms/")({
  component: function RoomListPage() {
    const { from, to } = Route.useSearch();
    return (
      <RoomList
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
