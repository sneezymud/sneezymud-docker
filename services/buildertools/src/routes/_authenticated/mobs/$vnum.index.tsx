import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MobEditor } from "@/components/mob-editor";
import { playerIdParamSchema } from "@/shared/schemas/common.ts";

const searchSchema = z.object({ owner: playerIdParamSchema.optional() });

export const Route = createFileRoute("/_authenticated/mobs/$vnum/")({
  component: function MobEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    const { owner } = Route.useSearch();
    return (
      <MobEditor
        key={`${vnumParam}-${owner ?? "self"}`}
        vnumParam={vnumParam}
        {...(owner !== undefined && { owner })}
      />
    );
  },
  validateSearch: searchSchema,
});
