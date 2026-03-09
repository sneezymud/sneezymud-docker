import { createFileRoute } from "@tanstack/react-router";

import { BackLink } from "@/components/back-link.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits/room-exits.tsx";
import { RoomExtras } from "@/components/room-extras.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useRoomEditor } from "@/hooks/use-room-editor.ts";
import { getRoomFieldGroups } from "@/shared/fields/room-fields.tsx";

export const Route = createFileRoute("/_authenticated/rooms/$vnum")({
  component: RoomEditorPage,
});

function RoomEditorInner({ vnumParam }: { vnumParam: string }) {
  const {
    currentValues,
    deletePending,
    dirty,
    error,
    exitEdits,
    extraEdits,
    handleDelete,
    handleFieldChange,
    handleSave,
    isError,
    isLoading,
    originalValues,
    resetEdits,
    room,
    saving,
    setExitEdits,
    setExtraEdits,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    user,
    vnum,
    zoneEntries,
    zonesError,
  } = useRoomEditor(vnumParam);

  if (isLoading || isError || !room) {
    return (
      <QueryStatus
        backLabel="Rooms"
        backTo="/rooms"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`room ${vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  return (
    <>
      <EntityHeader
        before={
          <BackLink
            title="Back to rooms"
            to="/rooms"
          />
        }
        breadcrumbs={[
          { label: "Rooms", to: "/rooms" },
          { label: `Room ${vnum}: ${room.name || "(unnamed)"}` },
        ]}
        deleteMessage={`Are you sure you want to delete room ${vnum}? This also removes all exits.`}
        deletePending={deletePending}
        dirty={dirty}
        onDelete={handleDelete}
        onReset={resetEdits}
        onSave={handleSave}
        saving={saving}
      />

      <EntityForm
        groups={getRoomFieldGroups(zoneEntries, zonesError, user?.powers ?? [])}
        onChange={handleFieldChange}
        originalValues={originalValues}
        values={currentValues}
      >
        <div className="grid grid-cols-1 items-start gap-6">
          <RoomExits
            exits={exitEdits ?? room.exits}
            onChange={setExitEdits}
            vnum={vnum}
          />

          <RoomExtras
            extras={extraEdits ?? room.extras}
            onChange={setExtraEdits}
            vnum={vnum}
          />
        </div>
      </EntityForm>

      <UnsavedChangesDialog
        unsavedNavProceed={unsavedNavProceed}
        unsavedNavReset={unsavedNavReset}
        unsavedNavStatus={unsavedNavStatus}
      />
    </>
  );
}

function RoomEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <RoomEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
