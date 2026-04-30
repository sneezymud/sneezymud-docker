import { EntityEditorShell } from "@/components/entity-editor-shell.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits/room-exits.tsx";
import { RoomExtras } from "@/components/room-extras.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { useOwnerName } from "@/hooks/use-owner-name.ts";
import { useRoomEditor } from "@/hooks/use-room-editor.ts";
import { getRoomFieldGroups } from "@/shared/fields/room-fields.tsx";
import { makeFieldGroupsReadOnly } from "@/shared/permissions.ts";

export function RoomEditor({
  owner,
  vnumParam,
}: {
  owner?: number;
  vnumParam: string;
}) {
  const ownerName = useOwnerName(owner);
  const editor = useRoomEditor(vnumParam, owner);

  if (editor.isLoading || editor.isError || !editor.room) {
    return (
      <QueryStatus
        backLabel="Rooms"
        backTo="/rooms"
        error={editor.error}
        isError={editor.isError}
        isLoading={editor.isLoading}
        label={`room ${editor.vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  const { readOnly, room, user, vnum, zoneEntries, zonesError } = editor;
  const powers = user?.powers ?? [];
  const breadcrumbLabel = `Room ${vnum} (${room.x},${room.y},${room.z}): ${room.name || "(unnamed)"}`;
  const diffDescription = `Room ${vnum}: ${room.name || "(unnamed)"}`;
  const groups = getRoomFieldGroups(zoneEntries, zonesError, powers);

  return (
    <EntityEditorShell
      breadcrumbLabel={breadcrumbLabel}
      diffDescription={diffDescription}
      editor={editor}
      owner={owner}
      ownerName={ownerName}
      powers={powers}
      type="room"
      vnum={vnum}
    >
      <EntityForm
        fieldErrors={editor.fieldErrors}
        groups={readOnly ? makeFieldGroupsReadOnly(groups) : groups}
        onChange={editor.handleFieldChange}
        originalValues={editor.originalValues}
        values={editor.currentValues}
      >
        <RoomExits
          exits={editor.exitEdits ?? room.exits}
          onChange={editor.setExitEdits}
          readOnly={readOnly}
          vnum={vnum}
        />

        <RoomExtras
          extras={editor.extraEdits ?? room.extras}
          onChange={editor.setExtraEdits}
          readOnly={readOnly}
          vnum={vnum}
        />
      </EntityForm>
    </EntityEditorShell>
  );
}
