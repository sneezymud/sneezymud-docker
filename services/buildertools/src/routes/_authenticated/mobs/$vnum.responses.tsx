import { createFileRoute } from "@tanstack/react-router";

import { MobResponseEditor } from "@/components/mob-response-editor";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/responses")({
  component: function MobResponseEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    return (
      <MobResponseEditor
        key={vnumParam}
        vnumParam={vnumParam}
      />
    );
  },
});
