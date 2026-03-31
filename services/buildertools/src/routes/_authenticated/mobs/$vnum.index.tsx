import { createFileRoute } from "@tanstack/react-router";

import { MobEditor } from "@/components/mob-editor";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/")({
  component: function MobEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    return (
      <MobEditor
        key={vnumParam}
        vnumParam={vnumParam}
      />
    );
  },
});
