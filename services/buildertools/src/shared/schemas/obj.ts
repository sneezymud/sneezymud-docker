import { z } from "zod";

import { vnumSchema } from "./common.ts";

export const objAffectSchema = z.object({
  mod1: z.number().int(),
  mod2: z.number().int(),
  type: z.number().int(),
  vnum: vnumSchema,
});

export type ObjAffect = z.infer<typeof objAffectSchema>;

export const objExtraSchema = z.object({
  description: z.string(),
  name: z.string(),
  vnum: vnumSchema,
});

export type ObjExtra = z.infer<typeof objExtraSchema>;

export const objSchema = z.object({
  action_desc: z.string(),
  action_flag: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  affects: z.array(objAffectSchema),
  can_be_seen: z.number().int(),
  cur_struct: z.number().int(),
  decay: z.number().int(),
  extras: z.array(objExtraSchema),
  long_desc: z.string(),
  material: z.number().int(),
  max_exist: z.number().int(),
  max_struct: z.number().int(),
  name: z.string(),
  price: z.number().int(),
  short_desc: z.string(),
  spec_proc: z.number().int(),
  type: z.number().int(),
  val0: z.number().int(),
  val1: z.number().int(),
  val2: z.number().int(),
  val3: z.number().int(),
  vnum: vnumSchema,
  volume: z.number().int(),
  wear_flag: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  weight: z.number(),
});

export type Obj = z.infer<typeof objSchema>;

export const objListItemSchema = z.object({
  name: z.string(),
  short_desc: z.string(),
  vnum: vnumSchema,
});

export type ObjListItem = z.infer<typeof objListItemSchema>;

export const objListSchema = z.array(objListItemSchema);

export const objCreateSchema = z.object({
  vnum: vnumSchema,
});

export type ObjCreate = z.infer<typeof objCreateSchema>;
