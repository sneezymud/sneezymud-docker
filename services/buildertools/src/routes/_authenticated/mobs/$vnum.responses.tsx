import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { QueryStatus } from "@/components/query-status.tsx";
import { useKeyboardSave } from "@/hooks/use-keyboard-save.ts";
import { apiFetch, ApiResponseError } from "@/shared/api-client.ts";
import { mobResponseSchema } from "@/shared/schemas/mob-response.ts";

export const Route = createFileRoute("/_authenticated/mobs/$vnum/responses")({
  component: MobResponseEditorPage,
});

const SYNTAX_HELP = `# Mob Response DSL

## Triggers
say {"keyword";        - Responds to player saying keyword
roomenter {"";         - Fires when player enters room
give {"item keyword";  - When given an item
package {"name";       - Reusable action block

## Actions
say <message>;         - Mob speaks
emote <action>;        - Mob emotes
tovict <message>;      - Message to triggering player
tonotvict <message>;   - Message to room except player
link package <name>;   - Execute a named package

## Variables
%n  - Player's name
%N  - Mob's name
%o  - Object name
%r  - Random player in room

## Color Codes
<r> red    <g> green   <b> blue
<c> cyan   <p> purple  <o> orange
<w> white  <k> black   <W> bold white
<R> bold red   <z> reset

## Flow Control
random <N>;           - N% chance to continue
randoption <n>;       - Branch n of random block
if quest ...;         - Quest conditionals

## Example
say {"hello";
  smile %n;
  tovict $n says, "Welcome!";
}`;

function MobResponseEditorPage() {
  const { vnum: vnumParam } = Route.useParams();
  const vnum = Number(vnumParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, error, isError, isLoading } = useQuery({
    queryFn: () =>
      apiFetch(`/api/mob-responses/${String(vnum)}`, mobResponseSchema),
    queryKey: ["mob-response", vnum],
  });

  // null = no edits yet (show server data), string = user has edited
  const [draft, setDraft] = useState<null | string>(null);

  const currentText = draft ?? data?.response ?? "";
  const dirty = draft !== null && draft !== (data?.response ?? "");

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
      await apiFetch(`/api/mob-responses/${String(vnum)}`, mobResponseSchema, {
        body: JSON.stringify({ response: currentText, vnum }),
        method: "PUT",
      });
    },
    onError: (err) => {
      toast.error(
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

  useKeyboardSave(handleSave, dirty);

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
        <button
          className="text-sm text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            void navigate({ params: { vnum: vnumParam }, to: "/mobs/$vnum" });
          }}
          type="button"
        >
          &larr; Mob {vnum}
        </button>
        <h2 className="text-lg font-semibold text-zinc-100">
          Responses — Mob {vnum}
        </h2>
        <div className="ml-auto flex items-center gap-3">
          {dirty ? (
            <span className="text-xs text-amber-400">Unsaved changes</span>
          ) : null}
          <button
            className="rounded bg-zinc-600 px-4 py-2 text-sm text-zinc-100 transition-colors hover:bg-zinc-500 disabled:opacity-50"
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
          <label
            className="mb-1 text-xs text-zinc-400"
            htmlFor="response-editor"
          >
            Response Script
          </label>
          <textarea
            className="min-h-[400px] flex-1 resize-y rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm leading-relaxed text-zinc-100 outline-none focus:border-zinc-500"
            id="response-editor"
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            spellCheck={false}
            value={currentText}
          />
        </div>

        <div className="overflow-y-auto rounded border border-zinc-700/50 bg-zinc-800/30 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-300">
            Syntax Reference
          </h3>
          <pre className="text-xs leading-relaxed whitespace-pre-wrap text-zinc-400">
            {SYNTAX_HELP}
          </pre>
        </div>
      </div>
    </div>
  );
}
