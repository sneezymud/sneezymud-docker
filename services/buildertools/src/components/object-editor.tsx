import { EntityEditorShell } from "@/components/entity-editor-shell.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useObjectEditor } from "@/hooks/use-object-editor.ts";
import {
  affectColumns,
  extraColumns,
} from "@/shared/fields/affect-columns.tsx";
import { getObjFieldGroups } from "@/shared/fields/obj-fields.tsx";
import { makeFieldGroupsReadOnly } from "@/shared/permissions.ts";

export function ObjectEditor({
  owner,
  vnumParam,
}: {
  owner?: number;
  vnumParam: string;
}) {
  const editor = useObjectEditor(vnumParam, owner);
  const { entity } = editor;

  if (editor.isLoading || editor.isError || !entity) {
    return (
      <QueryStatus
        backLabel="Objects"
        backTo="/objects"
        error={editor.error}
        isError={editor.isError}
        isLoading={editor.isLoading}
        label={`object ${editor.vnum}`}
        skeleton={<EntityFormSkeleton />}
      />
    );
  }

  const { currentItemType, permissions, readOnly, vnum } = editor;
  const entityLabel = `Object ${vnum}: ${entity.short_desc || "(unnamed)"}`;
  const baseGroups = getObjFieldGroups(currentItemType, permissions);
  const groups = readOnly ? makeFieldGroupsReadOnly(baseGroups) : baseGroups;

  return (
    <EntityEditorShell
      breadcrumbLabel={entityLabel}
      diffDescription={entityLabel}
      editor={editor}
    >
      <EntityForm
        fieldErrors={editor.fieldErrors}
        groups={groups}
        onChange={editor.handleFieldChange}
        originalValues={editor.originalValues}
        values={editor.currentValues}
      >
        <SubTable
          columns={affectColumns}
          emptyRow={{ mod1: 0, mod2: 0, type: 0, vnum }}
          helpParagraph="Each apply modifies a character stat when the object is equipped. The in-game engine loads at most 5 applies - extra applies are stored in the database but ignored at runtime."
          label="Applies"
          onChange={editor.setAffectEdits}
          readOnly={readOnly || !permissions.canEditObjectApplys}
          rows={editor.affectEdits ?? entity.affects}
        />

        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", name: "", vnum }}
          helpParagraph="Space-separated keywords players can 'look' at to see the description. Substring matching applies."
          label="Extra Descriptions"
          onChange={editor.setExtraEdits}
          readOnly={readOnly}
          rows={editor.extraEdits ?? entity.extras}
        />
      </EntityForm>
    </EntityEditorShell>
  );
}
