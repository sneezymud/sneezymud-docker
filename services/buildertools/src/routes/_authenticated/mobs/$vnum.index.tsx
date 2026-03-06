import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Mob, MobExtra, MobImm } from "@/shared/schemas/mob.ts";

import { BackLink } from "@/components/back-link.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { MobStringsEditor } from "@/components/mob-strings-editor.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { pruneEdits } from "@/lib/prune-edits.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { IMMUNITY_TYPES } from "@/shared/enums/index.ts";
import { mobFieldGroups } from "@/shared/fields/mob-fields.tsx";
import { hasPower, POWER } from "@/shared/powers.ts";
import { mobKeys } from "@/shared/query-keys.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";
import {
  gateSpecProcs,
  isUnassignableMobSpecProc,
} from "@/shared/spec-proc-access.ts";
import { useAuthStore } from "@/state/auth.ts";

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

function mobToFormValues(
  mob: Mob,
  edits: null | Partial<Mob>,
): Record<string, number | string> {
  const { extras: _e, immunities: _i, ...fields } = mob;
  if (!edits) {
    return fields;
  }
  const { extras: _ee, immunities: _ei, ...editFields } = edits;
  return { ...fields, ...editFields };
}

function MobEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const powers = user?.powers ?? [];

  const {
    data: mob,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${vnum}`, mobSchema),
    queryKey: mobKeys.detail(vnum),
  });

  const { data: mobResponse } = useQuery({
    queryFn: () => apiFetch(`/api/mob-responses/${vnum}`, mobResponseSchema),
    queryKey: ["mob-responses", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Mob>>(null);
  const [extraEdits, setExtraEdits] = useState<MobExtra[] | null>(null);
  const [immEdits, setImmEdits] = useState<MobImm[] | null>(null);

  const dirty = edits !== null || extraEdits !== null || immEdits !== null;

  const resetEdits = () => {
    setEdits(null);
    setExtraEdits(null);
    setImmEdits(null);
  };

  const {
    blockerProceed,
    blockerReset,
    blockerStatus,
    deletePending,
    handleDelete,
    handleSave,
    saving,
  } = useEntityEditor({
    allKey: mobKeys.all,
    data: mob,
    deletePath: `/api/mobs/${vnum}`,
    detailKey: mobKeys.detail(vnum),
    dirty,
    listPath: "/mobs",
    onReset: resetEdits,
    saveFn: async () => {
      if (!mob) return null;
      const body: Mob = {
        ...mob,
        ...edits,
        extras: extraEdits ?? mob.extras,
        immunities: immEdits ?? mob.immunities,
      };
      return apiFetch(`/api/mobs/${vnum}`, mobSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    validate: () => {
      if (!mob) return null;
      const merged = { ...mob, ...edits };
      const requiredFields = [
        { key: "name" as const, label: "Keywords" },
        { key: "short_desc" as const, label: "Short Description" },
        { key: "long_desc" as const, label: "Long Description" },
        { key: "description" as const, label: "Detailed Description" },
      ];
      const missing = requiredFields
        .filter((f) => !merged[f.key].trim())
        .map((f) => f.label);
      if (missing.length > 0) {
        return `Required fields cannot be empty: ${missing.join(", ")}`;
      }
      return null;
    },
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

  const currentValues = mobToFormValues(mob, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    setEdits((prev) => pruneEdits({ ...prev, [key]: value }, mob));
  };

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
        originalValues={mobToFormValues(mob, null)}
        values={currentValues}
      >
        <div className="grid gap-6">
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
        </div>
      </EntityForm>

      <UnsavedChangesDialog
        blockerProceed={blockerProceed}
        blockerReset={blockerReset}
        blockerStatus={blockerStatus}
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
