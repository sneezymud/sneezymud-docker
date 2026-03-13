import { createFileRoute, Link } from "@tanstack/react-router";

import type { ColumnDef } from "@/components/sub-table.tsx";
import type { MobImm } from "@/shared/schemas/mob.ts";

import { BackLink } from "@/components/back-link.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { MobStringsEditor } from "@/components/mob-strings-editor.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useMobEditor } from "@/hooks/use-mob-editor.ts";
import { IMMUNITY_TYPES } from "@/shared/enums/index.ts";
import { mobFieldGroups } from "@/shared/fields/mob-fields.tsx";
import { hasPower, POWER } from "@/shared/powers.ts";
import {
  gateSpecProcs,
  isUnassignableMobSpecProc,
} from "@/shared/spec-proc-access.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/")({
  component: MobEditorPage,
});

function prepareMobFieldGroups(
  powers: number[],
  vnumParam: string,
  hasResponses: boolean,
) {
  return mobFieldGroups.map((g, i) => {
    const group = { ...g };
    if (i === 0) {
      group.header = (
        <Button
          asChild
          className="mb-2"
          size="sm"
          variant="link"
        >
          <Link
            params={{ vnum: vnumParam }}
            to="/mobs/$vnum/responses"
          >
            {hasResponses ? "Edit Mob Responses" : "Add Mob Response"}
          </Link>
        </Button>
      );
    }
    if (
      !hasPower(powers, POWER.MEDIT_IMP_POWER) &&
      g.fields.some((f) => f.key === "spec_proc")
    ) {
      group.fields = g.fields.map((f) =>
        f.key === "spec_proc" && f.type === "enum"
          ? {
              ...f,
              enumEntries: gateSpecProcs(
                f.enumEntries,
                isUnassignableMobSpecProc,
              ),
            }
          : f,
      );
    }
    return group;
  });
}

function MobEditorInner({ vnumParam }: { vnumParam: string }) {
  const {
    currentValues,
    deletePending,
    dirty,
    error,
    extraEdits,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
    immEdits,
    isError,
    isLoading,
    mob,
    mobResponse,
    originalValues,
    powers,
    resetEdits,
    saving,
    setExtraEdits,
    setImmEdits,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  } = useMobEditor(vnumParam);

  if (isLoading || isError || !mob) {
    return (
      <QueryStatus
        backLabel="Mobs"
        backTo="/mobs"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`mob ${vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  return (
    <>
      <EntityHeader
        before={
          <BackLink
            title="Back to mobs"
            to="/mobs"
          />
        }
        breadcrumbs={[
          { label: "Mobs", to: "/mobs" },
          { label: `Mob ${vnum}: ${mob.short_desc || "(unnamed)"}` },
        ]}
        deleteMessage={`Are you sure you want to delete mob ${vnum}? This also removes extras, immunities, and responses.`}
        deletePending={deletePending}
        dirty={dirty}
        onDelete={handleDelete}
        onReset={resetEdits}
        onSave={handleSave}
        saving={saving}
      />

      <EntityForm
        groups={prepareMobFieldGroups(
          powers,
          vnumParam,
          !!mobResponse?.response.trim(),
        )}
        onChange={handleFieldChange}
        originalValues={originalValues}
        values={currentValues}
      >
        <MobStringsEditor
          onChange={setExtraEdits}
          rows={extraEdits ?? mob.extras}
          vnum={vnum}
        />

        <SubTable
          columns={immColumns}
          emptyRow={{ amt: 0, type: 0, vnum }}
          help="Percentage modifier: positive = resistance (100 = immune), negative = vulnerability (-100 = double damage)."
          label="Immunities"
          onChange={setImmEdits}
          rows={immEdits ?? mob.immunities}
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

function MobEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <MobEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}

const immColumns: Array<ColumnDef<MobImm>> = [
  {
    entries: IMMUNITY_TYPES,
    key: "type",
    label: "Immunity Type",
    type: "enum",
    width: "200px",
  },
  { key: "amt", label: "Amount", type: "number", width: "140px" },
];
