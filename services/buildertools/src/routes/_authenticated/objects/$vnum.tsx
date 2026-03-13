import { createFileRoute } from "@tanstack/react-router";

import { BackLink } from "@/components/back-link.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useObjectEditor } from "@/hooks/use-object-editor.ts";
import {
  affectColumns,
  extraColumns,
} from "@/shared/fields/affect-columns.tsx";
import { getObjFieldGroups } from "@/shared/fields/obj-fields.tsx";
import { hasPower, POWER } from "@/shared/powers.ts";

export const Route = createFileRoute("/_authenticated/objects/$vnum")({
  component: ObjectEditorPage,
});

function ObjectEditorInner({ vnumParam }: { vnumParam: string }) {
  const {
    affectEdits,
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
    powers,
    resetEdits,
    saving,
    setAffectEdits,
    setExtraEdits,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  } = useObjectEditor(vnumParam);

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
        saving={saving}
      />

      <EntityForm
        fieldErrors={fieldErrors}
        groups={getObjFieldGroups(currentItemType, powers)}
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
          readOnly={!hasPower(powers, POWER.OEDIT_APPLYS)}
          rows={affectEdits ?? obj.affects}
        />

        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", name: "", vnum }}
          helpParagraph="Space-separated keywords players can 'look' at to see the description. Substring matching applies."
          label="Extra Descriptions"
          onChange={setExtraEdits}
          rows={extraEdits ?? obj.extras}
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

function ObjectEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <ObjectEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
