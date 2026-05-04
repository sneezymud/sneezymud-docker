import { EntityEditorShell } from "@/components/entity-editor-shell.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits/room-exits.tsx";
import { RoomExtras } from "@/components/room-extras.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
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
  const editor = useRoomEditor(vnumParam, owner);
  const { entity } = editor;

  if (editor.isLoading || editor.isError || !entity) {
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

  const { powers, readOnly, vnum, zoneEntries, zonesError } = editor;
  const breadcrumbLabel = `Room ${vnum} (${entity.x},${entity.y},${entity.z}): ${entity.name || "(unnamed)"}`;
  const diffDescription = `Room ${vnum}: ${entity.name || "(unnamed)"}`;
  const baseGroups = getRoomFieldGroups(zoneEntries, zonesError, powers);
  const groups = readOnly ? makeFieldGroupsReadOnly(baseGroups) : baseGroups;

  return (
    <EntityEditorShell
      breadcrumbLabel={breadcrumbLabel}
      diffDescription={diffDescription}
      editor={editor}
    >
      <EntityForm
        fieldErrors={editor.fieldErrors}
        groups={groups}
        onChange={editor.handleFieldChange}
        originalValues={editor.originalValues}
        values={editor.currentValues}
      >
        <RoomExits
          exits={editor.exitEdits ?? entity.exits}
          onChange={editor.setExitEdits}
          readOnly={readOnly}
          vnum={vnum}
        />

        <RoomExtras
          extras={editor.extraEdits ?? entity.extras}
          onChange={editor.setExtraEdits}
          readOnly={readOnly}
          vnum={vnum}
        />
      </EntityForm>
    </EntityEditorShell>
  );
}
