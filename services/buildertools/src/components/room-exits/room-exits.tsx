import type { RoomExit } from "@/shared/schemas/room.ts";

import { AddButton } from "@/components/add-button.tsx";
import { ConfirmDialog } from "@/components/confirm-dialog.tsx";
import { SectionHeader } from "@/components/section-header.tsx";

import { ExitRow } from "./exit-row.tsx";
import { hasExitData, useExitEditor } from "./use-exit-editor.ts";

interface RoomExitsProps {
  exits: RoomExit[];
  onChange: (exits: RoomExit[]) => void;
  readOnly?: boolean;
  vnum: number;
}

export function RoomExits({ exits, onChange, readOnly, vnum }: RoomExitsProps) {
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
    <fieldset
      className="p-1"
      disabled={readOnly}
    >
      <SectionHeader
        action={
          readOnly ? undefined : (
            <AddButton
              aria-label="Add exit"
              className="max-h-min"
              disabled={availableDirections.length === 0}
              onClick={addExit}
            />
          )
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

      <div className="space-y-10">
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
  );
}
