import type { FieldGroupDef } from "@/shared/types/entity-form.ts";

import { hasPower, POWER } from "./powers.ts";

export interface BuilderPermissions {
  canEditMobs: boolean;
  canEditMobSpecProc: boolean;
  canEditObjectApplys: boolean;
  canEditObjectCost: boolean;
  canEditObjects: boolean;
  canEditObjectWeapons: boolean;
  canEditPrototypeFlag: boolean;
  canEditRooms: boolean;
  canEditRoomSpecProc: boolean;
  canEditUnassignableObjSpecProc: boolean;
  canPublish: boolean;
  isSenior: boolean;
}

export function resolvePermissions(
  powers: number[],
  isSenior: boolean,
): BuilderPermissions {
  if (isSenior) {
    return {
      canEditMobs: true,
      canEditMobSpecProc: true,
      canEditObjectApplys: true,
      canEditObjectCost: true,
      canEditObjects: true,
      canEditObjectWeapons: true,
      canEditPrototypeFlag: true,
      canEditRooms: true,
      canEditRoomSpecProc: true,
      canEditUnassignableObjSpecProc: true,
      canPublish: true,
      isSenior: true,
    };
  }
  return {
    canEditMobs: hasPower(powers, POWER.MEDIT),
    canEditMobSpecProc: hasPower(powers, POWER.MEDIT_IMP_POWER),
    canEditObjectApplys: hasPower(powers, POWER.OEDIT_APPLYS),
    canEditObjectCost: hasPower(powers, POWER.OEDIT_COST),
    canEditObjects: hasPower(powers, POWER.OEDIT),
    canEditObjectWeapons: hasPower(powers, POWER.OEDIT_WEAPONS),
    canEditPrototypeFlag: hasPower(powers, POWER.OEDIT_NOPROTOS),
    canEditRooms:
      hasPower(powers, POWER.REDIT) &&
      hasPower(powers, POWER.RSAVE) &&
      hasPower(powers, POWER.EDIT),
    canEditRoomSpecProc: hasPower(powers, POWER.REDIT_ENABLED),
    canEditUnassignableObjSpecProc: hasPower(powers, POWER.OEDIT_IMP_POWER),
    canPublish: hasPower(powers, POWER.LOW),
    isSenior: false,
  };
}

/** Mark all fields in every group as readOnly. */
export function makeFieldGroupsReadOnly(
  groups: FieldGroupDef[],
): FieldGroupDef[] {
  return groups.map((g) => ({
    ...g,
    fields: g.fields.map((f) => ({ ...f, readOnly: true })),
  }));
}
