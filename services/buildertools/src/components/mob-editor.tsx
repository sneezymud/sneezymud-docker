import { Link } from "@tanstack/react-router";

import type { ColumnDef } from "@/components/sub-table.tsx";
import type { MobImm } from "@/shared/schemas/mob.ts";

import { EntityEditorShell } from "@/components/entity-editor-shell.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { MobStringsEditor } from "@/components/mob-strings-editor.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useMobEditor } from "@/hooks/use-mob-editor.ts";
import { useOwnerName } from "@/hooks/use-owner-name.ts";
import { IMMUNITY_TYPES } from "@/shared/enums/index.ts";
import { mobFieldGroups } from "@/shared/fields/mob-fields.tsx";
import { makeFieldGroupsReadOnly } from "@/shared/permissions.ts";
import { hasPower, POWER } from "@/shared/powers.ts";
import {
  gateSpecProcs,
  isUnassignableMobSpecProc,
} from "@/shared/spec-proc-access.ts";

export function MobEditor({
  owner,
  vnumParam,
}: {
  owner?: number;
  vnumParam: string;
}) {
  const ownerName = useOwnerName(owner);
  const editor = useMobEditor(vnumParam, owner);

  if (editor.isLoading || editor.isError || !editor.mob) {
    return (
      <QueryStatus
        backLabel="Mobs"
        backTo="/mobs"
        error={editor.error}
        isError={editor.isError}
        isLoading={editor.isLoading}
        label={`mob ${editor.vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  const { mob, mobResponse, powers, readOnly, vnum } = editor;
  const entityLabel = `Mob ${vnum}: ${mob.short_desc || "(unnamed)"}`;
  const groups = prepareMobFieldGroups(
    powers,
    vnumParam,
    !!mobResponse?.response.trim(),
    owner,
  );

  return (
    <EntityEditorShell
      breadcrumbLabel={entityLabel}
      diffDescription={entityLabel}
      editor={editor}
      owner={owner}
      ownerName={ownerName}
      powers={powers}
      type="mob"
      vnum={vnum}
    >
      <EntityForm
        fieldErrors={editor.fieldErrors}
        groups={readOnly ? makeFieldGroupsReadOnly(groups) : groups}
        onChange={editor.handleFieldChange}
        originalValues={editor.originalValues}
        values={editor.currentValues}
      >
        <MobStringsEditor
          onChange={editor.setExtraEdits}
          readOnly={readOnly}
          rows={editor.extraEdits ?? mob.extras}
          vnum={vnum}
        />

        <SubTable
          columns={immColumns}
          emptyRow={{ amt: 0, type: 0, vnum }}
          help="Percentage modifier: positive = resistance (100 = immune), negative = vulnerability (-100 = double damage)."
          label="Immunities"
          onChange={editor.setImmEdits}
          readOnly={readOnly}
          rows={editor.immEdits ?? mob.immunities}
        />
      </EntityForm>
    </EntityEditorShell>
  );
}

function prepareMobFieldGroups(
  powers: number[],
  vnumParam: string,
  hasResponses: boolean,
  owner: number | undefined,
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
            {...(owner !== undefined && { search: { owner } })}
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
