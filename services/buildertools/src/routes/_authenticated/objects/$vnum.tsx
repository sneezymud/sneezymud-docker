import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  EXTRA_FLAGS,
  ITEM_TYPES,
  MATERIAL_TYPES,
  OBJ_SPEC_PROCS,
  WEAR_FLAGS,
} from "@/shared/enums/index.ts";
import { getObjValueLabels } from "@/shared/enums/obj-value-labels.ts";
import { objectKeys } from "@/shared/query-keys.ts";
import { objSchema } from "@/shared/schemas/obj.ts";

export const Route = createFileRoute("/_authenticated/objects/$vnum")({
  component: ObjectEditorPage,
});

function getObjFieldGroups(itemType: number): FieldGroupDef[] {
  const valLabels = getObjValueLabels(itemType);
  return [
    {
      fields: [
        { key: "name", label: "Keywords", required: true, type: "text" },
        {
          key: "short_desc",
          label: "Short Description",
          required: true,
          type: "text",
        },
        { key: "long_desc", label: "Long Description", type: "textarea" },
        { key: "action_desc", label: "Action Description", type: "textarea" },
      ],
      title: "Identity",
    },
    {
      fields: [
        {
          enumEntries: ITEM_TYPES,
          key: "type",
          label: "Item Type",
          type: "enum",
        },
        {
          bitfieldEntries: EXTRA_FLAGS,
          key: "action_flag",
          label: "Extra Flags",
          type: "bitfield",
        },
        {
          bitfieldEntries: WEAR_FLAGS,
          key: "wear_flag",
          label: "Wear Flags",
          type: "bitfield",
        },
      ],
      title: "Classification",
    },
    {
      fields: [
        {
          help: valLabels[0].help,
          key: "val0",
          label: valLabels[0].label,
          type: "number",
        },
        {
          help: valLabels[1].help,
          key: "val1",
          label: valLabels[1].label,
          type: "number",
        },
        {
          help: valLabels[2].help,
          key: "val2",
          label: valLabels[2].label,
          type: "number",
        },
        {
          help: valLabels[3].help,
          key: "val3",
          label: valLabels[3].label,
          type: "number",
        },
      ],
      title: "Type-Specific Values",
    },
    {
      fields: [
        { key: "weight", label: "Weight", type: "number" },
        { key: "volume", label: "Volume", type: "number" },
        { key: "price", label: "Price", type: "number" },
        {
          enumEntries: MATERIAL_TYPES,
          key: "material",
          label: "Material",
          type: "enum",
        },
      ],
      title: "Physical",
    },
    {
      fields: [
        { key: "max_struct", label: "Max Structure", type: "number" },
        { key: "cur_struct", label: "Current Structure", type: "number" },
        {
          help: "Ticks until item decays (0 = never)",
          key: "decay",
          label: "Decay Time",
          type: "number",
        },
        {
          help: "Max instances in the world (0 = unlimited)",
          key: "max_exist",
          label: "Max Exist",
          type: "number",
        },
        {
          help: "Minimum perception to notice this item",
          key: "can_be_seen",
          label: "Can Be Seen",
          type: "number",
        },
        {
          enumEntries: OBJ_SPEC_PROCS,
          help: "Special procedure ID (0 = none)",
          key: "spec_proc",
          label: "Special Proc",
          type: "enum",
        },
      ],
      title: "Limits & Behavior",
    },
  ];
}

const affectColumns: Array<ColumnDef<ObjAffect>> = [
  { key: "type", label: "Apply Type", type: "number", width: "120px" },
  { key: "mod1", label: "Modifier", type: "number", width: "120px" },
  { key: "mod2", label: "Modifier 2", type: "number", width: "120px" },
];

const extraColumns: Array<ColumnDef<ObjExtra>> = [
  { key: "name", label: "Keywords", type: "text", width: "200px" },
  { key: "description", label: "Description", type: "textarea", width: "1fr" },
];

function objToFormValues(
  obj: Obj,
  edits: null | Partial<Obj>,
): Record<string, number | string> {
  const { affects: _a, extras: _e, ...fields } = obj;
  if (!edits) {
    return fields;
  }
  const { affects: _ea, extras: _ee, ...editFields } = edits;
  return { ...fields, ...editFields };
}

function ObjectEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);

  const {
    data: obj,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/objects/${vnum}`, objSchema),
    queryKey: objectKeys.detail(vnum),
  });

  const [edits, setEdits] = useState<null | Partial<Obj>>(null);
  const [affectEdits, setAffectEdits] = useState<null | ObjAffect[]>(null);
  const [extraEdits, setExtraEdits] = useState<null | ObjExtra[]>(null);

  const dirty = edits !== null || affectEdits !== null || extraEdits !== null;

  const {
    blockerProceed,
    blockerReset,
    blockerStatus,
    deletePending,
    handleDelete,
    handleSave,
    saving,
  } = useEntityEditor({
    allKey: objectKeys.all,
    data: obj,
    deletePath: `/api/objects/${vnum}`,
    detailKey: objectKeys.detail(vnum),
    dirty,
    listPath: "/objects",
    onReset: () => {
      setEdits(null);
      setAffectEdits(null);
      setExtraEdits(null);
    },
    saveFn: async () => {
      if (!obj) {
        return null;
      }
      const body: Obj = {
        ...obj,
        ...edits,
        affects: affectEdits ?? obj.affects,
        extras: extraEdits ?? obj.extras,
      };
      return apiFetch(`/api/objects/${vnum}`, objSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
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

  const currentValues = objToFormValues(obj, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="mb-4 space-y-1">
        <Breadcrumbs
          items={[
            { label: "Objects", to: "/objects" },
            {
              label: `Object ${vnum}: ${obj.short_desc || "(unnamed)"}`,
            },
          ]}
        />
        <h2 className="text-foreground text-xl font-bold">
          Object {vnum}: {obj.short_desc || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        deleteMessage={`Are you sure you want to delete object ${vnum}? This also removes all affects and extra descriptions.`}
        deletePending={deletePending}
        dirty={dirty}
        groups={getObjFieldGroups(
          typeof currentValues["type"] === "number" ? currentValues["type"] : 0,
        )}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onReset={() => {
          setEdits(null);
          setAffectEdits(null);
          setExtraEdits(null);
        }}
        onSave={handleSave}
        originalValues={objToFormValues(obj, null)}
        saving={saving}
        values={currentValues}
      >
        <SubTable
          columns={affectColumns}
          emptyRow={{ mod1: 0, mod2: 0, type: 0, vnum }}
          label="Applies"
          onChange={setAffectEdits}
          rows={affectEdits ?? obj.affects}
          singularLabel="apply"
        />
        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", name: "", vnum }}
          label="Extra Descriptions"
          onChange={setExtraEdits}
          rows={extraEdits ?? obj.extras}
          singularLabel="extra description"
        />
      </EntityForm>

      <ConfirmDialog
        confirmLabel="Discard changes"
        message="You have unsaved changes that will be lost."
        onCancel={() => {
          blockerReset?.();
        }}
        onConfirm={() => {
          blockerProceed?.();
        }}
        open={blockerStatus === "blocked"}
        title="Unsaved Changes"
        variant="danger"
      />
    </div>
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
