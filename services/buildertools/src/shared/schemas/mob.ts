import { z } from "zod";

export const mobExtraSchema = z.object({
  description: z.string(),
  keyword: z.string(),
  vnum: z.number().int(),
});

export type MobExtra = z.infer<typeof mobExtraSchema>;

export const mobImmSchema = z.object({
  amt: z.number().int(),
  type: z.number().int(),
  vnum: z.number().int(),
});

export type MobImm = z.infer<typeof mobImmSchema>;

export const mobSchema = z.object({
  ac: z.number(),
  actions: z.number().int(),
  adjacent_sound: z.string(),
  affects: z.number().int(),
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
  letter: z.string().max(1),
  level: z.number().int(),
  local_sound: z.string(),
  long_desc: z.string(),
  max_exist: z.number().int(),
  name: z.string(),
  per: z.number().int(),
  pos: z.number().int(),
  race: z.number().int(),
  sex: z.number().int(),
  short_desc: z.string(),
  skin: z.number().int(),
  spe: z.number().int(),
  spec_proc: z.number().int(),
  str: z.number().int(),
  tohit: z.number().int(),
  vision: z.number().int(),
  vnum: z.number().int(),
  weight: z.number().int(),
  wis: z.number().int(),
});

export type Mob = z.infer<typeof mobSchema>;

export const mobListItemSchema = z.object({
  name: z.string(),
  vnum: z.number().int(),
});

export type MobListItem = z.infer<typeof mobListItemSchema>;

export const mobListSchema = z.array(mobListItemSchema);

export const mobCreateSchema = z.object({
  vnum: z.number().int(),
});

export type MobCreate = z.infer<typeof mobCreateSchema>;
