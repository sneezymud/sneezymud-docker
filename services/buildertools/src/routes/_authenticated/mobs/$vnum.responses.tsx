import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { CodeEditor } from "@/components/code-editor/code-editor.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { mobKeys } from "@/shared/query-keys.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/responses")({
  component: MobResponseEditorPage,
});

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

function MobResponseEditorInner({ vnumParam }: { vnumParam: string }) {
  const vnum = Number(vnumParam);

  const { data, error, isError, isLoading } = useQuery({
    queryFn: () => apiFetch(`/api/mob-responses/${vnum}`, mobResponseSchema),
    queryKey: mobKeys.response(vnum),
  });

  const { data: mob } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${vnum}`, mobSchema),
    queryKey: mobKeys.detail(vnum),
  });

  const desc = mob?.short_desc;
  const mobName = desc !== undefined && desc !== "" ? desc : `Mob ${vnum}`;

  // null = no edits yet (show server data), string = user has edited
  const [draft, setDraft] = useState<null | string>(null);

  const currentText = draft ?? data?.response ?? "";
  const dirty = draft !== null && draft !== (data?.response ?? "");

  const { blockerProceed, blockerReset, blockerStatus, handleSave, saving } =
    useEntityEditor({
      allKey: mobKeys.response(vnum),
      data,
      detailKey: mobKeys.response(vnum),
      dirty,
      onReset: () => {
        setDraft(null);
      },
      saveFn: async () =>
        apiFetch(`/api/mob-responses/${vnum}`, mobResponseSchema, {
          body: JSON.stringify({ response: currentText, vnum }),
          method: "PUT",
        }),
    });

  if (isLoading || isError) {
    return (
      <QueryStatus
        backLabel={`Mob ${vnum}`}
        backTo={`/mobs/${vnum}`}
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`responses for mob ${vnum}`}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 space-y-1">
        <Breadcrumbs
          items={[
            { label: "Mobs", to: "/mobs" },
            { label: mobName, to: `/mobs/${vnum}` },
            { label: "Responses" },
          ]}
        />
        <h2 className="text-foreground text-2xl font-bold">
          Responses — {mobName}
          <span className="text-muted-foreground ml-1 text-sm font-normal">
            (#{vnum})
          </span>
        </h2>
      </div>
      <div className="border-border bg-background/95 mb-4 flex items-center gap-3 border-b py-3 shadow-sm backdrop-blur-sm">
        <Button
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <span
          aria-live="polite"
          className="contents"
        >
          {dirty ? (
            <Badge
              className="animate-in fade-in slide-in-from-top-1 gap-1.5 text-amber-400 duration-150"
              variant="outline"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              Unsaved changes
              <Button
                className="ml-1"
                onClick={() => {
                  setDraft(null);
                }}
                size="xs"
                variant="link"
              >
                Discard
              </Button>
            </Badge>
          ) : null}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
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

function MobResponseEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  return (
    <MobResponseEditorInner
      key={vnumParam}
      vnumParam={vnumParam}
    />
  );
}
