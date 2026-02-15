import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { EntityForm } from "@/components/entity-form.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { apiFetch } from "@/shared/api-client.ts";
import { objSchema } from "@/shared/schemas/obj.ts";

export const Route = createFileRoute("/_authenticated/objects/$vnum")({
  component: ObjectEditorPage,
});

const objFieldGroups: FieldGroupDef[] = [
  {
    fields: [
      { key: "name", label: "Keywords", type: "text" },
      { key: "short_desc", label: "Short Description", type: "text" },
      { key: "long_desc", label: "Long Description", type: "text" },
      { key: "action_desc", label: "Action Description", type: "text" },
    ],
    title: "Identity",
  },
  {
    fields: [
      {
        help: "Item category (5=weapon, 8=armor, 15=container, etc.)",
        key: "type",
        label: "Item Type",
        type: "number",
      },
      {
        help: "Bitfield for item behavior",
        key: "action_flag",
        label: "Extra Flags",
        type: "number",
      },
      {
        help: "Bitfield for equip positions",
        key: "wear_flag",
        label: "Wear Flags",
        type: "number",
      },
    ],
    title: "Classification",
  },
  {
    fields: [
      {
        help: "Meaning depends on item type",
        key: "val0",
        label: "Value 0",
        type: "number",
      },
      { key: "val1", label: "Value 1", type: "number" },
      { key: "val2", label: "Value 2", type: "number" },
      { key: "val3", label: "Value 3", type: "number" },
    ],
    title: "Type-Specific Values",
  },
  {
    fields: [
      { key: "weight", label: "Weight", type: "number" },
      { key: "volume", label: "Volume", type: "number" },
      { key: "price", label: "Price", type: "number" },
      { key: "material", label: "Material", type: "number" },
    ],
    title: "Physical",
  },
  {
    fields: [
      { key: "max_struct", label: "Max Structure", type: "number" },
      { key: "cur_struct", label: "Current Structure", type: "number" },
      { key: "decay", label: "Decay Time", type: "number" },
      { key: "max_exist", label: "Max Exist", type: "number" },
      { key: "can_be_seen", label: "Can Be Seen", type: "number" },
      { key: "spec_proc", label: "Special Proc", type: "number" },
    ],
    title: "Limits & Behavior",
  },
];

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

function ObjectEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  const vnum = Number(vnumParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: obj, isLoading } = useQuery({
    queryFn: () => apiFetch(`/api/objects/${String(vnum)}`, objSchema),
    queryKey: ["object", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Obj>>(null);
  const [affectEdits, setAffectEdits] = useState<null | ObjAffect[]>(null);
  const [extraEdits, setExtraEdits] = useState<null | ObjExtra[]>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dirty = edits !== null || affectEdits !== null || extraEdits !== null;

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [dirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!obj) {
        return;
      }
      const body: Obj = {
        ...obj,
        ...edits,
        affects: affectEdits ?? obj.affects,
        extras: extraEdits ?? obj.extras,
      };
      await apiFetch(`/api/objects/${String(vnum)}`, objSchema, {
        body: JSON.stringify(body),
        method: "PUT",
      });
    },
    onSuccess: async () => {
      setEdits(null);
      setAffectEdits(null);
      setExtraEdits(null);
      await queryClient.invalidateQueries({ queryKey: ["object", vnum] });
      await queryClient.invalidateQueries({ queryKey: ["objects"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(
        `/api/objects/${String(vnum)}`,
        z.object({ ok: z.boolean() }),
        { method: "DELETE" },
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["objects"] });
      await navigate({ to: "/objects" });
    },
  });

  if (isLoading || !obj) {
    return <p className="text-sm text-zinc-500">Loading object {vnum}...</p>;
  }

  const currentValues = objToFormValues(obj, edits);

  const handleFieldChange = (key: string, value: number | string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          className="text-sm text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            void navigate({ to: "/objects" });
          }}
          type="button"
        >
          &larr; Objects
        </button>
        <h2 className="text-lg font-semibold text-zinc-100">
          Object {vnum}: {obj.short_desc || "(unnamed)"}
        </h2>
      </div>

      <EntityForm
        dirty={dirty}
        groups={objFieldGroups}
        onChange={handleFieldChange}
        onDelete={handleDelete}
        onSave={handleSave}
        saving={saveMutation.isPending}
        values={currentValues}
      >
        <SubTable
          columns={affectColumns}
          emptyRow={{ mod1: 0, mod2: 0, type: 0, vnum }}
          label="Applies"
          onChange={setAffectEdits}
          rows={affectEdits ?? obj.affects}
        />
        <SubTable
          columns={extraColumns}
          emptyRow={{ description: "", name: "", vnum }}
          label="Extra Descriptions"
          onChange={setExtraEdits}
          rows={extraEdits ?? obj.extras}
        />
      </EntityForm>

      {showDeleteConfirm && !deleteMutation.isPending ? (
        <div className="mt-4 rounded border border-red-800/50 bg-red-900/10 p-4">
          <p className="mb-3 text-sm text-red-400">
            Are you sure you want to delete object {vnum}? This also removes all
            affects and extra descriptions.
          </p>
          <div className="flex gap-2">
            <button
              className="rounded bg-red-800 px-3 py-1.5 text-sm text-red-100 hover:bg-red-700"
              onClick={() => {
                deleteMutation.mutate();
              }}
              type="button"
            >
              Yes, delete
            </button>
            <button
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
              onClick={() => {
                setShowDeleteConfirm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
