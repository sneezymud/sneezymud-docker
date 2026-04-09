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
  WIZARD: 31,
} as const;

export const POWER_LABELS = {
  [POWER.BUILDER]: "POWER_BUILDER",
  [POWER.EDIT]: "POWER_EDIT",
  [POWER.LOW]: "POWER_LOW",
  [POWER.MEDIT]: "POWER_MEDIT",
  [POWER.MEDIT_IMP_POWER]: "POWER_MEDIT_IMP_POWER",
  [POWER.NO_LIMITS]: "POWER_NO_LIMITS",
  [POWER.OEDIT]: "POWER_OEDIT",
  [POWER.OEDIT_APPLYS]: "POWER_OEDIT_APPLYS",
  [POWER.OEDIT_COST]: "POWER_OEDIT_COST",
  [POWER.OEDIT_IMP_POWER]: "POWER_OEDIT_IMP_POWER",
  [POWER.OEDIT_NOPROTOS]: "POWER_OEDIT_NOPROTOS",
  [POWER.OEDIT_WEAPONS]: "POWER_OEDIT_WEAPONS",
  [POWER.REDIT]: "POWER_REDIT",
  [POWER.REDIT_ENABLED]: "POWER_REDIT_ENABLED",
  [POWER.RSAVE]: "POWER_RSAVE",
  [POWER.WIZARD]: "POWER_WIZARD",
} as const satisfies Record<number, string>;

export function hasPower(powers: number[], power: number): boolean {
  return powers.includes(power);
}

/**
 * The "senior" tier is a web-app concept that intentionally does not match
 * any single C++ power. The C++ engine treats POWER_LOW (publishing),
 * POWER_NO_LIMITS (vnum bypass), and POWER_WIZARD (high-tier admin) as
 * three independent capabilities held by historically separate roles.
 *
 * The modern community has consolidated these roles: the same trusted users
 * who publish content also bypass vnum limits and handle admin operations.
 * The web app collapses all three into a single "senior" tier with full
 * cross-owner read/write/publish/delete access. This is more permissive
 * than `limitPowerCheck` in `wiz_powers.cc:24` (which only honors
 * POWER_NO_LIMITS) and more permissive than `cmd_low.cc:1667` (which only
 * honors POWER_LOW). The divergence is deliberate.
 */
const SENIOR_POWERS = [POWER.LOW, POWER.NO_LIMITS, POWER.WIZARD] as const;

export function isSenior(powers: number[]): boolean {
  return SENIOR_POWERS.some((p) => powers.includes(p));
}
