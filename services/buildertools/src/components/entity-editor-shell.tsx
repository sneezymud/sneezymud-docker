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

export type EditorEntityType = "mob" | "object" | "room";

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
  type: EditorEntityType;
  vnum: number;
}) {
  const config = EDITOR_CONFIG[type];
  const [diffOpen, setDiffOpen] = useState(false);

  const diffQuery = useQuery({
    enabled: false,
    queryFn: () =>
      apiFetch(
        `/api/publish/diff/${EDITOR_CONFIG[type].diffEntityType}/${vnum}${ownerSuffix(editor.cOwner)}`,
        EDITOR_CONFIG[type].diffSchema,
      ),
    queryKey: entityKeys.diff(type, vnum, editor.cOwner),
  });

  const missingPowers = config.requiredPowers
    .filter((p) => !hasPower(powers, p))
    .map((p) => POWER_LABELS[p]);

  return (
    <>
      <EntityHeader
        before={
          <BackLink
            title={config.backTitle}
            to={config.breadcrumbList.to}
          />
        }
        breadcrumbs={[config.breadcrumbList, { label: breadcrumbLabel }]}
        deleteMessage={`Are you sure you want to delete ${type} ${vnum}? ${config.deleteCascadeNote}`}
        deletePending={editor.deletePending}
        dirty={editor.dirty}
        onDelete={editor.handleDelete}
        onReset={editor.resetEdits}
        onSave={editor.handleSave}
        readOnly={editor.readOnly}
        saving={editor.saving}
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
        canPublish={editor.permissions.canPublish}
        description={diffDescription}
        diffQuery={diffQuery}
        entityType={config.diffEntityType}
        fields={config.diffFields}
        onOpenChange={setDiffOpen}
        open={diffOpen}
        type={type}
        vnum={vnum}
        {...(owner !== undefined && { ownerPlayerId: owner })}
      />

      {editor.readOnly && <ReadOnlyBanner missingPowers={missingPowers} />}
      {children}

      <UnsavedChangesDialog
        onSaveAndProceed={editor.handleSaveAndProceed}
        readOnly={editor.readOnly}
        saving={editor.saving}
        unsavedNavProceed={editor.unsavedNavProceed}
        unsavedNavReset={editor.unsavedNavReset}
        unsavedNavStatus={editor.unsavedNavStatus}
      />
    </>
  );
}
