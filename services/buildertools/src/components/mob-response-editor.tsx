import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { BackLink } from "@/components/back-link.tsx";
import { CodeEditor } from "@/components/code-editor/code-editor.tsx";
import { EntityHeader } from "@/components/entity-header.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { UnsavedChangesDialog } from "@/components/unsaved-changes-dialog.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { useOwnerName } from "@/hooks/use-owner-name.ts";
import { canonicalOwner, entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";
import { useAuthStore } from "@/state/auth.ts";

export function MobResponseEditor({
  owner,
  vnumParam,
}: {
  owner?: number;
  vnumParam: string;
}) {
  const ownerName = useOwnerName(owner);

  const {
    cOwner,
    currentText,
    dirty,
    error,
    handleSave,
    handleSaveAndProceed,
    isError,
    isLoading,
    mobName,
    saving,
    setDraft,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  } = useMobResponseEditor(vnumParam, owner);

  if (isLoading || isError) {
    return (
      <QueryStatus
        backLabel={`Mob ${vnum}`}
        backTo={`/mobs/${vnum}${ownerSuffix(cOwner)}`}
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`responses for mob ${vnum}`}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <EntityHeader
        before={
          <BackLink
            title="Back to mob"
            to={`/mobs/${vnum}${ownerSuffix(cOwner)}`}
          />
        }
        breadcrumbs={[
          { label: "Mobs", to: "/mobs" },
          { label: mobName },
          { label: "Responses" },
        ]}
        dirty={dirty}
        onReset={() => {
          setDraft(null);
        }}
        onSave={handleSave}
        saving={saving}
        {...(ownerName !== undefined && { ownerName })}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4">
        <div className="flex flex-col">
          <span className="text-muted-foreground mb-1 text-xs">
            Response Script
          </span>

          <CodeEditor
            onChange={setDraft}
            onSave={dirty && !saving ? handleSave : undefined}
            value={currentText}
          />
        </div>

        <ScrollArea className="border-border/50 bg-muted/30 rounded border">
          <div className="p-4">
            <h3 className="text-foreground mb-3 text-sm font-medium">
              Syntax Reference
            </h3>

            <Accordion
              collapsible
              type="single"
            >
              {SYNTAX_SECTIONS.map((section) => (
                <AccordionItem
                  key={section.title}
                  value={section.title}
                >
                  <AccordionTrigger className="text-muted-foreground hover:text-foreground py-1.5 text-xs font-medium">
                    {section.title}
                  </AccordionTrigger>

                  <AccordionContent>
                    <pre className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
      </div>

      <UnsavedChangesDialog
        onSaveAndProceed={handleSaveAndProceed}
        saving={saving}
        unsavedNavProceed={unsavedNavProceed}
        unsavedNavReset={unsavedNavReset}
        unsavedNavStatus={unsavedNavStatus}
      />
    </div>
  );
}

function useMobResponseEditor(vnumParam: string, owner: number | undefined) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const cOwner = canonicalOwner(owner, user?.playerId ?? 0);

  const { data, error, isError, isLoading } = useQuery({
    queryFn: () =>
      apiFetch(
        `/api/mob-responses/${vnum}${ownerSuffix(cOwner)}`,
        mobResponseSchema,
      ),
    queryKey: entityKeys.detail("mob-response", vnum, cOwner),
  });

  const { data: mob } = useQuery({
    queryFn: () =>
      apiFetch(`/api/mobs/${vnum}${ownerSuffix(cOwner)}`, mobSchema),
    queryKey: entityKeys.detail("mob", vnum, cOwner),
  });

  const mobName =
    mob?.short_desc !== undefined && mob.short_desc !== ""
      ? mob.short_desc
      : `Mob ${vnum}`;

  // null = no edits yet (show server data), string = user has edited
  const [draft, setDraft] = useState<null | string>(null);

  const currentText = draft ?? data?.response ?? "";
  const dirty = draft !== null && draft !== (data?.response ?? "");

  const {
    handleSave,
    handleSaveAndProceed,
    saving,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
  } = useEntityEditor({
    allKey: entityKeys.all("mob"),
    data,
    detailKey: entityKeys.detail("mob-response", vnum, cOwner),
    dirty,
    onReset: () => {
      setDraft(null);
    },
    saveFn: async () =>
      apiFetch(
        `/api/mob-responses/${vnum}${ownerSuffix(cOwner)}`,
        mobResponseSchema,
        {
          body: JSON.stringify({ response: currentText, vnum }),
          method: "PUT",
        },
      ),
  });

  return {
    cOwner,
    currentText,
    dirty,
    error,
    handleSave,
    handleSaveAndProceed,
    isError,
    isLoading,
    mobName,
    saving,
    setDraft,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
  };
}

const SYNTAX_SECTIONS = [
  {
    content: `say {"keyword";        - Responds to player saying keyword
roomenter {"";         - Fires when player enters room
give {"item keyword";  - When given an item
package {"name";       - Reusable action block`,
    title: "Triggers",
  },
  {
    content: `say <message>;         - Mob speaks
emote <action>;        - Mob emotes
tovict <message>;      - Message to triggering player
tonotvict <message>;   - Message to room except player
link package <name>;   - Execute a named package`,
    title: "Actions",
  },
  {
    content: `%n  - Player's name
%N  - Mob's name
%o  - Object name
%r  - Random player in room`,
    title: "Variables",
  },
  {
    content: `<r> red    <g> green   <b> blue
<c> cyan   <p> purple  <o> orange
<w> white  <k> black   <W> bold white
<R> bold red   <z> reset`,
    title: "Color Codes",
  },
  {
    content: `random <N>;           - N% chance to continue
randoption <n>;       - Branch n of random block
if quest ...;         - Quest conditionals`,
    title: "Flow Control",
  },
  {
    content: `say {"hello";
  smile %n;
  tovict $n says, "Welcome!";
}`,
    title: "Example",
  },
];
