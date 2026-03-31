import { createFileRoute } from "@tanstack/react-router";

import { RoomEditor } from "@/components/room-editor";

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: function RoomEditorPage() {
    const { vnum: vnumParam } = Route.useParams();
    return (
      <RoomEditor
        key={vnumParam}
        vnumParam={vnumParam}
      />
    );
  },
});
