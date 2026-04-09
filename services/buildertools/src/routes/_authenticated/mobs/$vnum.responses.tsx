import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MobResponseEditor } from "@/components/mob-response-editor";
import { playerIdParamSchema } from "@/shared/schemas/common.ts";

const searchSchema = z.object({ owner: playerIdParamSchema.optional() });

export const Route = createFileRoute("/_authenticated/mobs/$vnum/responses")({
  component: function MobResponseEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    const { owner } = Route.useSearch();
    return (
      <MobResponseEditor
        key={`${vnumParam}-${owner ?? "self"}`}
        vnumParam={vnumParam}
        {...(owner !== undefined && { owner })}
      />
    );
  },
  validateSearch: searchSchema,
});
