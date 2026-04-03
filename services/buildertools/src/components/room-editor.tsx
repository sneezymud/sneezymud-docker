import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BackLink } from "@/components/back-link.tsx";
import { DiffButton, DiffSheet } from "@/components/diff-sheet.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { RoomExits } from "@/components/room-exits/room-exits.tsx";
import { RoomExtras } from "@/components/room-extras.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useRoomEditor } from "@/hooks/use-room-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { roomDiffFields } from "@/shared/fields/diff-fields.ts";
import { getRoomFieldGroups } from "@/shared/fields/room-fields.tsx";
import { resolvePermissions } from "@/shared/permissions.ts";
import { roomDiffSchema } from "@/shared/schemas/publish.ts";

export function RoomEditor({ vnumParam }: { vnumParam: string }) {
  const [diffOpen, setDiffOpen] = useState(false);

  const {
    currentValues,
    deletePending,
    dirty,
    error,
    exitEdits,
    extraEdits,
    fieldErrors,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
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

  const permissions = resolvePermissions(
    user?.powers ?? [],
    user?.isSenior ?? false,
  );

  const diffQuery = useQuery({
    enabled: false,
    queryFn: () => apiFetch(`/api/publish/diff/rooms/${vnum}`, roomDiffSchema),
    queryKey: ["diff", "room", vnum],
  });

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
          {
            label: `Room ${vnum} (${room.x},${room.y},${room.z}): ${room.name || "(unnamed)"}`,
          },
        ]}
        deleteMessage={`Are you sure you want to delete room ${vnum}? This also removes all exits.`}
        deletePending={deletePending}
        dirty={dirty}
        onDelete={handleDelete}
        onReset={resetEdits}
        onSave={handleSave}
        saving={saving}
      >
        <DiffButton
          isFetching={diffQuery.isFetching}
          onDiff={() => {
            void diffQuery.refetch();
            setDiffOpen(true);
          }}
        />
      </EntityHeader>

      <DiffSheet
        canPublish={permissions.canPublish}
        description={`Room ${vnum}: ${room.name || "(unnamed)"}`}
        diffQuery={diffQuery}
        entityType="rooms"
        fields={roomDiffFields}
        onOpenChange={setDiffOpen}
        open={diffOpen}
        vnum={vnum}
      />

      <EntityForm
        fieldErrors={fieldErrors}
        groups={getRoomFieldGroups(zoneEntries, zonesError, user?.powers ?? [])}
        onChange={handleFieldChange}
        originalValues={originalValues}
        values={currentValues}
      >
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
      </EntityForm>

      <UnsavedChangesDialog
        onSaveAndProceed={handleSaveAndProceed}
        saving={saving}
        unsavedNavProceed={unsavedNavProceed}
        unsavedNavReset={unsavedNavReset}
        unsavedNavStatus={unsavedNavStatus}
      />
    </>
  );
}
