import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BackLink } from "@/components/back-link.tsx";
import { DiffButton, DiffSheet } from "@/components/diff-sheet.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { ReadOnlyBanner } from "@/components/read-only-banner.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useObjectEditor } from "@/hooks/use-object-editor.ts";
import { useOwnerName } from "@/hooks/use-owner-name.ts";
import { entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  affectColumns,
  extraColumns,
} from "@/shared/fields/affect-columns.tsx";
import { objDiffFields } from "@/shared/fields/diff-fields.ts";
import { getObjFieldGroups } from "@/shared/fields/obj-fields.tsx";
import { makeFieldGroupsReadOnly } from "@/shared/permissions.ts";
import { hasPower, POWER, POWER_LABELS } from "@/shared/powers.ts";
import { objDiffSchema } from "@/shared/schemas/publish.ts";

export function ObjectEditor({
  owner,
  vnumParam,
}: {
  owner?: number;
  vnumParam: string;
}) {
  const [diffOpen, setDiffOpen] = useState(false);
  const ownerName = useOwnerName(owner);

  const {
    affectEdits,
    cOwner,
    currentItemType,
    deletePending,
    dirty,
    error,
    expandedOriginal,
    expandedValues,
    extraEdits,
    fieldErrors,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
    isError,
    isLoading,
    obj,
    permissions,
    powers,
    readOnly,
    resetEdits,
    saving,
    setAffectEdits,
    setExtraEdits,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  } = useObjectEditor(vnumParam, owner);

  const diffQuery = useQuery({
    enabled: false,
    queryFn: () =>
      apiFetch(
        `/api/publish/diff/objects/${vnum}${ownerSuffix(cOwner)}`,
        objDiffSchema,
      ),
    queryKey: entityKeys.diff("object", vnum, cOwner),
  });

  if (isLoading || isError || !obj) {
    return (
      <QueryStatus
        backLabel="Objects"
        backTo="/objects"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`object ${vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  return (
    <>
      <EntityHeader
        before={
          <BackLink
            title="Back to objects"
            to="/objects"
          />
        }
        breadcrumbs={[
          { label: "Objects", to: "/objects" },
          { label: `Object ${vnum}: ${obj.short_desc || "(unnamed)"}` },
        ]}
        deleteMessage={`Are you sure you want to delete object ${vnum}? This also removes all affects and extra descriptions.`}
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
        description={`Object ${vnum}: ${obj.short_desc || "(unnamed)"}`}
        diffQuery={diffQuery}
        entityType="objects"
        fields={objDiffFields}
        onOpenChange={setDiffOpen}
        open={diffOpen}
        type="object"
        vnum={vnum}
        {...(owner !== undefined && { ownerPlayerId: owner })}
      />

      {readOnly && (
        <ReadOnlyBanner
          missingPowers={[POWER.OEDIT]
            .filter((p) => !hasPower(powers, p))
            .map((p) => POWER_LABELS[p])}
        />
      )}

      <EntityForm
        fieldErrors={fieldErrors}
        groups={
          readOnly
            ? makeFieldGroupsReadOnly(
                getObjFieldGroups(currentItemType, permissions),
              )
            : getObjFieldGroups(currentItemType, permissions)
        }
        onChange={handleFieldChange}
        originalValues={expandedOriginal}
        values={expandedValues}
      >
        <SubTable
          columns={affectColumns}
          emptyRow={{ mod1: 0, mod2: 0, type: 0, vnum }}
          helpParagraph="Each apply modifies a character stat when the object is equipped. The in-game engine loads at most 5 applies - extra applies are stored in the database but ignored at runtime."
          label="Applies"
          onChange={setAffectEdits}
          readOnly={readOnly || !permissions.canEditObjectApplys}
          rows={affectEdits ?? obj.affects}
        />

        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", name: "", vnum }}
          helpParagraph="Space-separated keywords players can 'look' at to see the description. Substring matching applies."
          label="Extra Descriptions"
          onChange={setExtraEdits}
          readOnly={readOnly}
          rows={extraEdits ?? obj.extras}
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
