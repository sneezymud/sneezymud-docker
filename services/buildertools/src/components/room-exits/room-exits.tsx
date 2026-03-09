import type { RoomExit } from "@/shared/schemas/room.ts";

import { AddButton } from "@/components/add-button.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { SectionHeader } from "@/components/section-header.tsx";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

import { ExitRow } from "./exit-row.tsx";
import { hasExitData, useExitEditor } from "./use-exit-editor.ts";

interface RoomExitsProps {
  exits: RoomExit[];
  onChange: (exits: RoomExit[]) => void;
  vnum: number;
}

export function RoomExits({ exits, onChange, vnum }: RoomExitsProps) {
  const {
    addExit,
    availableDirections,
    changeDirection,
    pendingRemove,
    removeExit,
    rowKeys,
    setPendingRemove,
    update,
    usedDirections,
  } = useExitEditor(exits, onChange, vnum);

  return (
    <TooltipProvider delayDuration={300}>
      <fieldset className="bg-card border-border/50 rounded-lg border p-5">
        <SectionHeader
          action={
            <AddButton
              aria-label="Add exit"
              disabled={availableDirections.length === 0}
              onClick={addExit}
            />
          }
          title="Exits"
          tooltip={
            <>
              <p>
                Exits define how players move between rooms. Each direction can
                have one exit with an optional door.
              </p>

              <p>
                Exits work immediately from the database without zone file
                entries. However, any door (Type other than None) will be closed
                on every zone reset. A zone file "D" command controls whether a
                door resets as open, closed, or locked.
              </p>
            </>
          }
        />

        <div className="space-y-3">
          {exits.map((exit, index) => (
            <ExitRow
              exit={exit}
              key={rowKeys[index]}
              onChangeDirection={(dir) => {
                changeDirection(index, dir);
              }}
              onRequestRemove={() => {
                if (hasExitData(exit)) {
                  setPendingRemove(index);
                } else {
                  removeExit(index);
                }
              }}
              onUpdate={(field, value) => {
                update(index, field, value);
              }}
              prefix={rowKeys[index] ?? ""}
              usedDirections={usedDirections}
            />
          ))}
        </div>

        <ConfirmDialog
          message="This exit has data (destination, door name, description, or flags). Remove it anyway?"
          onCancel={() => {
            setPendingRemove(null);
          }}
          onConfirm={() => {
            if (pendingRemove !== null) {
              removeExit(pendingRemove);
              setPendingRemove(null);
            }
          }}
          open={pendingRemove !== null}
          title="Remove exit?"
        />
      </fieldset>
    </TooltipProvider>
  );
}
