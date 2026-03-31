import { createFileRoute } from "@tanstack/react-router";

import { ObjectEditor } from "@/components/object-editor";

export const Route = createFileRoute("/_authenticated/objects/$vnum")({
  component: function ObjectEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    return (
      <ObjectEditor
        key={vnumParam}
        vnumParam={vnumParam}
      />
    );
  },
});
