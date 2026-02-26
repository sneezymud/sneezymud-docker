import { z } from "zod";

import { vnumSchema } from "./common.ts";

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
  description: z.string(),
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
  ac: z.number().min(0).max(127),
  actions: z.number().int().min(0).max(4_294_967_295),
  adjacent_sound: z.string(),
  affects: z.number().int().min(0).max(4_294_967_295),
  agi: z.number().int(),
  attacks: z.number().min(0),
  bra: z.number().int(),
  can_be_seen: z.number().int().min(0).max(10_000),
  cha: z.number().int(),
  class: z.number().int(),
  con: z.number().int(),
  damage_level: z.number().min(0).max(127),
  damage_precision: z.number().int().min(0).max(100),
  def_position: z.number().int(),
  description: z.string(),
  dex: z.number().int(),
  extras: z.array(mobExtraSchema),
  fact_perc: z.number().int().min(0).max(100),
  faction: z.number().int(),
  foc: z.number().int(),
  gold: z.number().int().min(0).max(10),
  height: z.number().int().min(0).max(10_000),
  hpbonus: z.number().min(0).max(127),
  immunities: z.array(mobImmSchema),
  intel: z.number().int(),
  kar: z.number().int(),
  level: z.number().int().min(1).max(100),
  local_sound: z.string(),
  long_desc: z.string(),
  max_exist: z.number().int().min(0).max(9999),
  name: z.string(),
  per: z.number().int(),
  race: z.number().int(),
  sex: z.number().int(),
  short_desc: z.string(),
  skin: z.number().int(),
  spe: z.number().int(),
  spec_proc: z.number().int(),
  str: z.number().int(),
  tohit: z.number().int().min(-50).max(50),
  vision: z.number().int().min(-100).max(100),
  vnum: vnumSchema,
  weight: z.number().int().min(0).max(100_000),
  wis: z.number().int(),
});

export type Mob = z.infer<typeof mobSchema>;

export const mobListItemSchema = z.object({
  name: z.string(),
  short_desc: z.string(),
  vnum: vnumSchema,
});

export type MobListItem = z.infer<typeof mobListItemSchema>;

export const mobListSchema = z.array(mobListItemSchema);

export const mobCreateSchema = z.object({
  vnum: vnumSchema,
});

export type MobCreate = z.infer<typeof mobCreateSchema>;
