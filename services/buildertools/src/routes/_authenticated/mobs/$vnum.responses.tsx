import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Breadcrumbs } from "@/components/breadcrumbs.tsx";
import { CodeEditor } from "@/components/code-editor/code-editor.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { QueryStatus } from "@/components/query-status.tsx";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { useSyncDirty } from "@/hooks/use-sync-dirty.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";
import { mobSchema } from "@/shared/schemas/mob.ts";
import { toastError } from "@/shared/toast.ts";

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
  const queryClient = useQueryClient();

  const { data, error, isError, isLoading } = useQuery({
    queryFn: () =>
      apiFetch(`/api/mob-responses/${String(vnum)}`, mobResponseSchema),
    queryKey: ["mob-response", vnum],
  });

  const { data: mob } = useQuery({
    queryFn: () => apiFetch(`/api/mobs/${String(vnum)}`, mobSchema),
    queryKey: ["mob", vnum],
  });

  const desc = mob?.short_desc;
  const mobName =
    desc !== undefined && desc !== "" ? desc : `Mob ${String(vnum)}`;

  // null = no edits yet (show server data), string = user has edited
  const [draft, setDraft] = useState<null | string>(null);

  const currentText = draft ?? data?.response ?? "";
  const dirty = draft !== null && draft !== (data?.response ?? "");
  useSyncDirty(dirty);

  const { proceed, reset, status } = useBlocker({
    enableBeforeUnload: true,
    shouldBlockFn: () => dirty,
    withResolver: true,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/mob-responses/${String(vnum)}`, mobResponseSchema, {
        body: JSON.stringify({ response: currentText, vnum }),
        method: "PUT",
      });
    },
    onError: (err) => {
      toastError(
        err instanceof ApiResponseError ? err.message : "Failed to save",
      );
    },
    onSuccess: async () => {
      setDraft(null);
      toast.success("Saved");
      await queryClient.invalidateQueries({
        queryKey: ["mob-response", vnum],
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  useKeyboardSave(handleSave, dirty && !saveMutation.isPending);

  if (isLoading || isError) {
    return (
      <QueryStatus
        backLabel={`Mob ${String(vnum)}`}
        backTo={`/mobs/${String(vnum)}`}
        error={error}
        isError={isError}
        isLoading={isLoading}
        label={`responses for mob ${String(vnum)}`}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: "Mobs", to: "/mobs" },
              { label: mobName, to: `/mobs/${String(vnum)}` },
              { label: "Responses" },
            ]}
          />
          <h2 className="text-xl font-bold text-zinc-100">
            Responses — {mobName}
            <span className="ml-1 text-sm font-normal text-zinc-400">
              (#{String(vnum)})
            </span>
          </h2>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {dirty ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
              Unsaved changes
              <button
                className="ml-1 text-xs text-zinc-400 underline hover:text-zinc-200"
                onClick={() => {
                  setDraft(null);
                }}
                type="button"
              >
                Discard
              </button>
            </span>
          ) : null}
          <button
            className="bg-accent hover:bg-accent/80 focus-visible:ring-accent rounded px-4 py-2 text-sm text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => {
              saveMutation.mutate();
            }}
            type="button"
          >
            {saveMutation.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col">
          <span className="mb-1 text-xs text-zinc-400">Response Script</span>
          <CodeEditor
            onChange={setDraft}
            onSave={dirty && !saveMutation.isPending ? handleSave : undefined}
            value={currentText}
          />
        </div>

        <div className="overflow-y-auto rounded border border-zinc-700/50 bg-zinc-800/30 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            Syntax Reference
          </h3>
          <div className="space-y-1">
            {SYNTAX_SECTIONS.map((section) => (
              <details
                className="group"
                key={section.title}
              >
                <summary className="cursor-pointer rounded px-2 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-700/30 hover:text-zinc-300">
                  {section.title}
                </summary>
                <pre className="mt-1 px-2 pb-2 text-xs leading-relaxed whitespace-pre-wrap text-zinc-400">
                  {section.content}
                </pre>
              </details>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Discard changes"
        message="You have unsaved changes that will be lost."
        onCancel={() => {
          reset?.();
        }}
        onConfirm={() => {
          proceed?.();
        }}
        open={status === "blocked"}
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
