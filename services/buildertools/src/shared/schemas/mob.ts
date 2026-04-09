import { z } from "zod";

import { UINT32_MAX } from "@/shared/constants.ts";

import { playerIdSchema, vnumSchema } from "./common.ts";

export const mobStringKeywords = [
  "bamfin",
  "bamfout",
  "deathcry",
  "movein",
  "moveout",
  "repop",
] as const;

export type MobStringKeyword = (typeof mobStringKeywords)[number];

export const mobExtraSchema = z.object({
  description: z.string().max(255),
  keyword: z.enum(mobStringKeywords),
  vnum: vnumSchema,
});

export type MobExtra = z.infer<typeof mobExtraSchema>;

export const mobImmSchema = z.object({
  amt: z.number().int(),
  type: z.number().int(),
  vnum: vnumSchema,
});

export type MobImm = z.infer<typeof mobImmSchema>;

export const mobSchema = z.object({
  ac: z.number(),
  actions: z.number().int().min(0).max(UINT32_MAX),
  adjacent_sound: z.string(),
  affects: z.number().int().min(0).max(UINT32_MAX),
  agi: z.number().int(),
  attacks: z.number(),
  bra: z.number().int(),
  can_be_seen: z.number().int(),
  cha: z.number().int(),
  class: z.number().int(),
  con: z.number().int(),
  damage_level: z.number(),
  damage_precision: z.number().int(),
  def_position: z.number().int(),
  description: z.string(),
  dex: z.number().int(),
  extras: z.array(mobExtraSchema),
  fact_perc: z.number().int(),
  faction: z.number().int(),
  foc: z.number().int(),
  gold: z.number().int(),
  height: z.number().int(),
  hpbonus: z.number(),
  immunities: z.array(mobImmSchema),
  intel: z.number().int(),
  kar: z.number().int(),
  level: z.number().int(),
  local_sound: z.string(),
  long_desc: z.string(),
  max_exist: z.number().int(),
  name: z.string(),
  per: z.number().int(),
  race: z.number().int(),
  sex: z.number().int(),
  short_desc: z.string(),
  skin: z.number().int(),
  spe: z.number().int(),
  spec_proc: z.number().int(),
  str: z.number().int(),
  tohit: z.number().int(),
  vision: z.number().int(),
  vnum: vnumSchema,
  weight: z.number().int(),
  wis: z.number().int(),
});

export type Mob = z.infer<typeof mobSchema>;

// Medit-matching range constraints for write validation.
// String fields that medit requires non-empty for saving are enforced with min(1).
export const mobInputSchema = mobSchema.extend({
  ac: z.number().min(0).max(127),
  adjacent_sound: z.string().max(255),
  agi: z.number().int().min(-25).max(25),
  attacks: z.number().min(0),
  bra: z.number().int().min(-25).max(25),
  can_be_seen: z.number().int().min(0).max(10_000),
  cha: z.number().int().min(-25).max(25),
  class: z.number().int().min(0).max(8),
  con: z.number().int().min(-25).max(25),
  damage_level: z.number().min(0).max(127),
  damage_precision: z.number().int().min(0).max(100),
  def_position: z.number().int().min(0).max(12),
  description: z.string().min(1),
  dex: z.number().int().min(-25).max(25),
  fact_perc: z.number().int().min(0).max(100),
  faction: z.number().int().min(0).max(3),
  foc: z.number().int().min(-25).max(25),
  gold: z.number().int().min(0).max(10),
  height: z.number().int().min(0).max(10_000),
  hpbonus: z.number().min(0).max(127),
  intel: z.number().int().min(-25).max(25),
  kar: z.number().int().min(-25).max(25),
  level: z.number().int().min(1).max(100),
  local_sound: z.string().max(255),
  long_desc: z.string().min(1).max(255),
  max_exist: z.number().int().min(0).max(9999),
  name: z.string().min(1).max(127),
  per: z.number().int().min(-25).max(25),
  race: z.number().int().min(0).max(126),
  sex: z.number().int().min(0).max(2),
  short_desc: z.string().min(1).max(127),
  skin: z.number().int().min(-200).max(200),
  spe: z.number().int().min(-25).max(25),
  spec_proc: z.number().int().min(0).max(222),
  str: z.number().int().min(-25).max(25),
  tohit: z.number().int().min(-50).max(50),
  vision: z.number().int().min(-100).max(100),
  weight: z.number().int().min(0).max(100_000),
  wis: z.number().int().min(-25).max(25),
});

export type MobInput = z.infer<typeof mobInputSchema>;

export const mobListItemSchema = z.object({
  level: z.number(),
  name: z.string(),
  owner: z.string().optional(),
  player_id: playerIdSchema.optional(),
  race: z.number(),
  short_desc: z.string(),
  vnum: vnumSchema,
});

export type MobListItem = z.infer<typeof mobListItemSchema>;

export const mobListSchema = z.array(mobListItemSchema);

export const mobCreateSchema = z.object({
  vnum: vnumSchema,
});

export type MobCreate = z.infer<typeof mobCreateSchema>;
