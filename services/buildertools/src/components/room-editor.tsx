import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BackLink } from "@/components/back-link.tsx";
import { DiffButton, DiffSheet } from "@/components/diff-sheet.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { ReadOnlyBanner } from "@/components/read-only-banner.tsx";
import { RoomExits } from "@/components/room-exits/room-exits.tsx";
import { RoomExtras } from "@/components/room-extras.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useOwnerName } from "@/hooks/use-owner-name.ts";
import { useRoomEditor } from "@/hooks/use-room-editor.ts";
import { entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { roomDiffFields } from "@/shared/fields/diff-fields.ts";
import { getRoomFieldGroups } from "@/shared/fields/room-fields.tsx";
import { makeFieldGroupsReadOnly } from "@/shared/permissions.ts";
import { hasPower, POWER, POWER_LABELS } from "@/shared/powers.ts";
import { roomDiffSchema } from "@/shared/schemas/publish.ts";

const ROOM_REQUIRED_POWERS = [POWER.REDIT, POWER.RSAVE, POWER.EDIT] as const;

export function RoomEditor({
  owner,
  vnumParam,
}: {
  owner?: number;
  vnumParam: string;
}) {
  const [diffOpen, setDiffOpen] = useState(false);
  const ownerName = useOwnerName(owner);

  const {
    cOwner,
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
    permissions,
    readOnly,
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
  } = useRoomEditor(vnumParam, owner);

  const diffQuery = useQuery({
    enabled: false,
    queryFn: () =>
      apiFetch(
        `/api/publish/diff/rooms/${vnum}${ownerSuffix(cOwner)}`,
        roomDiffSchema,
      ),
    queryKey: entityKeys.diff("room", vnum, cOwner),
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
        readOnly={readOnly}
        saving={saving}
        {...(ownerName !== undefined && { ownerName })}
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
        type="room"
        vnum={vnum}
        {...(owner !== undefined && { ownerPlayerId: owner })}
      />

      {readOnly && (
        <ReadOnlyBanner
          missingPowers={ROOM_REQUIRED_POWERS.filter(
            (p) => !hasPower(user?.powers ?? [], p),
          ).map((p) => POWER_LABELS[p])}
        />
      )}

      <EntityForm
        fieldErrors={fieldErrors}
        groups={
          readOnly
            ? makeFieldGroupsReadOnly(
                getRoomFieldGroups(zoneEntries, zonesError, user?.powers ?? []),
              )
            : getRoomFieldGroups(zoneEntries, zonesError, user?.powers ?? [])
        }
        onChange={handleFieldChange}
        originalValues={originalValues}
        values={currentValues}
      >
        <RoomExits
          exits={exitEdits ?? room.exits}
          onChange={setExitEdits}
          readOnly={readOnly}
          vnum={vnum}
        />

        <RoomExtras
          extras={extraEdits ?? room.extras}
          onChange={setExtraEdits}
          readOnly={readOnly}
          vnum={vnum}
        />
      </EntityForm>

      <UnsavedChangesDialog
        onSaveAndProceed={handleSaveAndProceed}
        readOnly={readOnly}
        saving={saving}
        unsavedNavProceed={unsavedNavProceed}
        unsavedNavReset={unsavedNavReset}
        unsavedNavStatus={unsavedNavStatus}
      />
    </>
  );
}
