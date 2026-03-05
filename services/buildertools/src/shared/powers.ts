/**
 * Immortal power file IDs from mapWizPowerToFile() in the C++ codebase.
 * These gate access to entity types and specific fields in builder tools.
 */
export const POWER = {
  BUILDER: 29,
  EDIT: 3,
  LOW: 63,
  MEDIT: 7,
  MEDIT_IMP_POWER: 9,
  NO_LIMITS: 110,
  OEDIT: 10,
  OEDIT_APPLYS: 12,
  OEDIT_COST: 11,
  OEDIT_IMP_POWER: 14,
  OEDIT_NOPROTOS: 13,
  OEDIT_WEAPONS: 20,
  REDIT: 1,
  REDIT_ENABLED: 2,
  RSAVE: 5,
} as const;

export function hasPower(powers: number[], power: number): boolean {
  return powers.includes(power);
}
