import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import type { ColumnDef } from "@/components/sub-table.tsx";
import type { MobImm } from "@/shared/schemas/mob.ts";

import { BackLink } from "@/components/back-link.tsx";
import { DiffButton, DiffSheet } from "@/components/diff-sheet.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { MobStringsEditor } from "@/components/mob-strings-editor.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useMobEditor } from "@/hooks/use-mob-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { IMMUNITY_TYPES } from "@/shared/enums/index.ts";
import { mobDiffFields } from "@/shared/fields/diff-fields.ts";
import { mobFieldGroups } from "@/shared/fields/mob-fields.tsx";
import { resolvePermissions } from "@/shared/permissions.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import { mobDiffSchema } from "@/shared/schemas/publish.ts";
import {
  gateSpecProcs,
  isUnassignableMobSpecProc,
} from "@/shared/spec-proc-access.ts";

export function MobEditor({ vnumParam }: { vnumParam: string }) {
  const [diffOpen, setDiffOpen] = useState(false);

  const {
    currentValues,
    deletePending,
    dirty,
    error,
    extraEdits,
    fieldErrors,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
    immEdits,
    isError,
    isLoading,
    isSenior,
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

  const permissions = resolvePermissions(powers, isSenior);

  const diffQuery = useQuery({
    enabled: false,
    queryFn: () => apiFetch(`/api/publish/diff/mobs/${vnum}`, mobDiffSchema),
    queryKey: ["diff", "mob", vnum],
  });

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
        description={`Mob ${vnum}: ${mob.short_desc || "(unnamed)"}`}
        diffQuery={diffQuery}
        entityType="mobs"
        fields={mobDiffFields}
        onOpenChange={setDiffOpen}
        open={diffOpen}
        vnum={vnum}
      />

      <EntityForm
        fieldErrors={fieldErrors}
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
