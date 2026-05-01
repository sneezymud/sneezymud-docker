import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BackLink } from "@/components/back-link.tsx";
import { DiffButton, DiffSheet } from "@/components/diff-sheet.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { ReadOnlyBanner } from "@/components/read-only-banner.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import {
  mobDiffFields,
  objDiffFields,
  roomDiffFields,
} from "@/shared/fields/diff-fields.ts";
import { hasPower, POWER, POWER_LABELS } from "@/shared/powers.ts";
import {
  mobDiffSchema,
  objDiffSchema,
  roomDiffSchema,
} from "@/shared/schemas/publish.ts";

interface EditorState {
  cOwner: number | undefined;
  deletePending: boolean;
  dirty: boolean;
  handleDelete: () => void;
  handleSave: () => void;
  handleSaveAndProceed: () => Promise<void>;
  permissions: { canPublish: boolean };
  readOnly: boolean;
  resetEdits: () => void;
  saving: boolean;
  unsavedNavProceed: (() => void) | undefined;
  unsavedNavReset: (() => void) | undefined;
  unsavedNavStatus: "blocked" | "idle";
}

export function EntityEditorShell({
  breadcrumbLabel,
  children,
  diffDescription,
  editor,
  owner,
  ownerName,
  powers,
  type,
  vnum,
}: {
  breadcrumbLabel: string;
  children: React.ReactNode;
  diffDescription: string;
  editor: EditorState;
  owner: number | undefined;
  ownerName: string | undefined;
  powers: number[];
  type: "mob" | "object" | "room";
  vnum: number;
}) {
  const {
    backTitle,
    breadcrumbList,
    deleteCascadeNote,
    diffEntityType,
    diffFields,
    requiredPowers,
  } = EDITOR_CONFIG[type];
  const {
    cOwner,
    deletePending,
    dirty,
    handleDelete,
    handleSave,
    handleSaveAndProceed,
    permissions: { canPublish },
    readOnly,
    resetEdits,
    saving,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
  } = editor;
  const [diffOpen, setDiffOpen] = useState(false);

  // Derive URL/schema inside queryFn so @tanstack/query/exhaustive-deps sees
  // them as dependencies of `type` (already in queryKey) rather than free vars.
  const diffQuery = useQuery({
    enabled: false,
    queryFn: () => {
      const { diffEntityType: entityType, diffSchema } = EDITOR_CONFIG[type];
      return apiFetch(
        `/api/publish/diff/${entityType}/${vnum}${ownerSuffix(cOwner)}`,
        diffSchema,
      );
    },
    queryKey: entityKeys.diff(type, vnum, cOwner),
  });

  const missingPowers = requiredPowers
    .filter((p) => !hasPower(powers, p))
    .map((p) => POWER_LABELS[p]);

  return (
    <>
      <EntityHeader
        before={
          <BackLink
            title={backTitle}
            to={breadcrumbList.to}
          />
        }
        breadcrumbs={[breadcrumbList, { label: breadcrumbLabel }]}
        deleteMessage={`Are you sure you want to delete ${type} ${vnum}? ${deleteCascadeNote}`}
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
        canPublish={canPublish}
        description={diffDescription}
        diffQuery={diffQuery}
        entityType={diffEntityType}
        fields={diffFields}
        onOpenChange={setDiffOpen}
        open={diffOpen}
        type={type}
        vnum={vnum}
        {...(owner !== undefined && { ownerPlayerId: owner })}
      />

      {readOnly && <ReadOnlyBanner missingPowers={missingPowers} />}
      {children}

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

const EDITOR_CONFIG = {
  mob: {
    backTitle: "Back to mobs",
    breadcrumbList: { label: "Mobs", to: "/mobs" },
    deleteCascadeNote: "This also removes extras, immunities, and responses.",
    diffEntityType: "mobs",
    diffFields: mobDiffFields,
    diffSchema: mobDiffSchema,
    requiredPowers: [POWER.MEDIT],
  },
  object: {
    backTitle: "Back to objects",
    breadcrumbList: { label: "Objects", to: "/objects" },
    deleteCascadeNote: "This also removes all affects and extra descriptions.",
    diffEntityType: "objects",
    diffFields: objDiffFields,
    diffSchema: objDiffSchema,
    requiredPowers: [POWER.OEDIT],
  },
  room: {
    backTitle: "Back to rooms",
    breadcrumbList: { label: "Rooms", to: "/rooms" },
    deleteCascadeNote: "This also removes all exits.",
    diffEntityType: "rooms",
    diffFields: roomDiffFields,
    diffSchema: roomDiffSchema,
    requiredPowers: [POWER.REDIT, POWER.RSAVE, POWER.EDIT],
  },
} as const;
