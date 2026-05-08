import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { Room, RoomExit, RoomExtra } from "@/shared/schemas/room.ts";
import type { EnumEntry } from "@/shared/types/enums.ts";

import { useEntityEditor } from "@/hooks/use-entity-editor.ts";
import { diffEdits } from "@/lib/diff-edits.ts";
import { canonicalOwner, entityKeys, ownerSuffix } from "@/lib/entity-keys.ts";
import { apiFetch } from "@/shared/api-client.ts";
import { resolvePermissions } from "@/shared/permissions.ts";
import { zoneKeys } from "@/shared/query-keys.ts";
import { roomSchema } from "@/shared/schemas/room.ts";
import { zoneListSchema } from "@/shared/schemas/zone.ts";
import { useAuthStore } from "@/state/auth.ts";

export function useRoomEditor(vnumParam: string, owner: number | undefined) {
  const vnum = Number(vnumParam);
  const user = useAuthStore((s) => s.user);
  const cOwner = canonicalOwner(owner, user?.playerId ?? 0);
  const powers = user?.powers ?? [];
  const permissions = resolvePermissions(powers, user?.isSenior ?? false);
  const readOnly = !permissions.canEditRooms;

  const {
    data: entity,
    error,
    isError,
    isLoading,
  } = useQuery({
    queryFn: () =>
      apiFetch(`/api/rooms/${vnum}${ownerSuffix(cOwner)}`, roomSchema),
    queryKey: entityKeys.detail("room", vnum, cOwner),
  });

  const { data: zones, isError: zonesError } = useQuery({
    queryFn: () => apiFetch("/api/zones", zoneListSchema),
    queryKey: zoneKeys.all,
  });

  const zoneEntries: EnumEntry[] | undefined = zones?.map(
    ({ zone_name, zone_nr }) => ({
      label: `${zone_nr}: ${zone_name}`,
      value: zone_nr,
    }),
  );

  const [edits, setEdits] = useState<null | Partial<Room>>(null);
  const [exitEdits, setExitEdits] = useState<null | RoomExit[]>(null);
  const [extraEdits, setExtraEdits] = useState<null | RoomExtra[]>(null);

  const dirty = edits !== null || exitEdits !== null || extraEdits !== null;

  function resetEdits() {
    setEdits(null);
    setExitEdits(null);
    setExtraEdits(null);
  }

  async function saveFn() {
    if (!entity) return null;
    const body: Room = {
      ...entity,
      ...edits,
      exits: exitEdits ?? entity.exits,
      extras: extraEdits ?? entity.extras,
    };
    return apiFetch(`/api/rooms/${vnum}${ownerSuffix(cOwner)}`, roomSchema, {
      body: JSON.stringify(body),
      method: "PUT",
    });
  }

  function validate() {
    if (!entity) return null;
    const merged = { ...entity, ...edits };
    const errors = requiredFields
      .filter(({ key }) => !merged[key].trim())
      .map(({ key, label }) => ({
        field: key,
        message: `${label} is required`,
      }));
    return errors.length > 0 ? errors : null;
  }

  const {
    clearFieldError,
    deletePending,
    fieldErrors,
    handleDelete,
    handleSave,
    handleSaveAndProceed,
    saving,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
  } = useEntityEditor({
    allKey: entityKeys.all("room"),
    data: entity,
    deletePath: `/api/rooms/${vnum}${ownerSuffix(cOwner)}`,
    detailKey: entityKeys.detail("room", vnum, cOwner),
    dirty,
    listPath: "/rooms",
    onReset: resetEdits,
    readOnly,
    saveFn,
    validate,
  });

  const currentValues = entity ? roomToFormValues(entity, edits) : {};
  const originalValues = entity ? roomToFormValues(entity, null) : {};

  function handleFieldChange(key: string, value: number | string) {
    if (!entity) return;
    clearFieldError(key);
    applyRoomFieldChange({ key, room: entity, setEdits, value });
  }

  return {
    cOwner,
    currentValues,
    deletePending,
    dirty,
    entity,
    error,
    exitEdits,
    extraEdits,
    fieldErrors,
    handleDelete,
    handleFieldChange,
    handleSave,
    handleSaveAndProceed,
    isError,
    isLoading,
    originalValues,
    owner,
    permissions,
    powers,
    readOnly,
    resetEdits,
    saving,
    setExitEdits,
    setExtraEdits,
    type: "room" as const,
    unsavedNavProceed,
    unsavedNavReset,
    unsavedNavStatus,
    vnum,
    zoneEntries,
    zonesError,
  };
}

function roomToFormValues(
  room: Room,
  edits: null | Partial<Room>,
): Record<string, null | number | string> {
  const { exits: _roomExits, extras: _roomExtras, ...roomFields } = room;
  if (!edits) {
    return roomFields;
  }
  const { exits: _editExits, extras: _editExtras, ...editFields } = edits;
  return { ...roomFields, ...editFields };
}

// Height and room_flag (INDOORS bit) are bidirectionally linked: setting a
// valid indoor height auto-sets the INDOORS flag, and toggling INDOORS adjusts
// height to match. Both branches must go through diffEdits to preserve dirty
// detection.
function applyRoomFieldChange({
  key,
  room,
  setEdits,
  value,
}: {
  key: string;
  room: Room;
  setEdits: React.Dispatch<React.SetStateAction<null | Partial<Room>>>;
  value: number | string;
}) {
  if (key === "height" && typeof value === "number") {
    const indoorsBit = 1 << 3;
    setEdits((prev) => {
      const currentFlags =
        typeof prev?.room_flag === "number" ? prev.room_flag : room.room_flag;
      if (value === -1) {
        // Outdoor: clear INDOORS bit
        return diffEdits(
          { ...prev, height: value, room_flag: currentFlags & ~indoorsBit },
          room,
        );
      } else if (value >= 1 && value <= 1000) {
        // Indoor: set INDOORS bit
        return diffEdits(
          { ...prev, height: value, room_flag: currentFlags | indoorsBit },
          room,
        );
      }
      return diffEdits({ ...prev, [key]: value }, room);
    });
    return;
  }

  if (key === "room_flag" && typeof value === "number") {
    const indoorsBit = 1 << 3;
    setEdits((prev) => {
      const currentFlags =
        typeof prev?.room_flag === "number" ? prev.room_flag : room.room_flag;
      const wasIndoors = (currentFlags & indoorsBit) !== 0;
      const isIndoors = (value & indoorsBit) !== 0;
      const currentHeight =
        typeof prev?.height === "number" ? prev.height : room.height;

      if (!wasIndoors && isIndoors && currentHeight === -1) {
        // Toggled INDOORS on while height is unlimited: set height to 100
        return diffEdits({ ...prev, height: 100, room_flag: value }, room);
      } else if (wasIndoors && !isIndoors) {
        // Toggled INDOORS off: set height to -1
        return diffEdits({ ...prev, height: -1, room_flag: value }, room);
      }
      return diffEdits({ ...prev, [key]: value }, room);
    });
    return;
  }

  setEdits((prev) => diffEdits({ ...prev, [key]: value }, room));
}

const requiredFields = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
] as const;
