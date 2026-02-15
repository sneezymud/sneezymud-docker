import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import type { FieldGroupDef } from "@/components/entity-form.tsx";
import type { ColumnDef } from "@/components/sub-table.tsx";
import type { Obj, ObjAffect, ObjExtra } from "@/shared/schemas/obj.ts";

import { EntityForm } from "@/components/entity-form.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { EntityFormSkeleton } from "@/components/skeleton.tsx";
import { SubTable } from "@/components/sub-table.tsx";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import {
  EXTRA_FLAGS,
  ITEM_TYPES,
  MATERIAL_TYPES,
  WEAR_FLAGS,
} from "@/shared/enums/index.ts";
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

  const {
    data: obj,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () => apiFetch(`/api/objects/${String(vnum)}`, objSchema),
    queryKey: ["object", vnum],
  });

  const [edits, setEdits] = useState<null | Partial<Obj>>(null);
  const [affectEdits, setAffectEdits] = useState<null | ObjAffect[]>(null);
  const [extraEdits, setExtraEdits] = useState<null | ObjExtra[]>(null);

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
    onError: (err) => {
      toast.error(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async () => {
      setEdits(null);
      setAffectEdits(null);
      setExtraEdits(null);
      toast.success("Saved");
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
    onError: (err) => {
      toast.error(
        err instanceof ApiResponseError ? err.message : "Failed to delete",
      );
    },
    onSuccess: async () => {
      toast.success("Deleted");
      await queryClient.invalidateQueries({ queryKey: ["objects"] });
      await navigate({ to: "/objects" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty);

  if (isLoading || isError || !obj) {
    return (
      <QueryStatus
        backLabel="Objects"
        backTo="/objects"
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`object ${String(vnum)}`}
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
        deleteMessage={`Are you sure you want to delete object ${String(vnum)}? This also removes all affects and extra descriptions.`}
        dirty={dirty}
        groups={objFieldGroups}
        onChange={handleFieldChange}
        onDelete={() => {
          deleteMutation.mutate();
        }}
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
    </div>
  );
}
