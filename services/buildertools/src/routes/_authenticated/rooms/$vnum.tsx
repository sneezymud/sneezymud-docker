import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { RoomEditor } from "@/components/room-editor";
import { playerIdParamSchema } from "@/shared/schemas/common.ts";

const searchSchema = z.object({ owner: playerIdParamSchema.optional() });

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: function RoomEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    const { owner } = Route.useSearch();
    return (
      <RoomEditor
        key={`${vnumParam}-${owner ?? "self"}`}
        vnumParam={vnumParam}
        {...(owner !== undefined && { owner })}
      />
    );
  },
  validateSearch: searchSchema,
});
