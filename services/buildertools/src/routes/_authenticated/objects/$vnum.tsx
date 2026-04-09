import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ObjectEditor } from "@/components/object-editor";
import { playerIdParamSchema } from "@/shared/schemas/common.ts";

const searchSchema = z.object({ owner: playerIdParamSchema.optional() });

export const Route = createFileRoute("/_authenticated/objects/$vnum")({
  component: function ObjectEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    const { owner } = Route.useSearch();
    return (
      <ObjectEditor
        key={`${vnumParam}-${owner ?? "self"}`}
        vnumParam={vnumParam}
        {...(owner !== undefined && { owner })}
      />
    );
  },
  validateSearch: searchSchema,
});
