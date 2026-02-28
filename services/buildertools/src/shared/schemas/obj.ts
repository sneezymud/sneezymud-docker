import { z } from "zod";

import { INT32_MAX, INT32_MIN } from "@/shared/constants.ts";

import { vnumSchema } from "./common.ts";

export const objAffectSchema = z.object({
  mod1: z.number().int().min(INT32_MIN).max(INT32_MAX),
  mod2: z.number().int().min(INT32_MIN).max(INT32_MAX),
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
  action_flag: z.number().int().min(INT32_MIN).max(INT32_MAX),
  affects: z.array(objAffectSchema),
  can_be_seen: z.number().int().min(0).max(25),
  cur_struct: z.number().int().min(-1).max(32_767),
  decay: z.number().int().min(-1).max(10_000),
  extras: z.array(objExtraSchema),
  long_desc: z.string(),
  material: z.number().int(),
  max_exist: z.number().int().min(0).max(9999),
  max_struct: z.number().int().min(-1).max(32_767),
  name: z.string(),
  price: z.number().int().min(0).max(1_000_000),
  short_desc: z.string(),
  spec_proc: z.number().int(),
  type: z.number().int(),
  val0: z.number().int().min(INT32_MIN).max(INT32_MAX),
  val1: z.number().int().min(INT32_MIN).max(INT32_MAX),
  val2: z.number().int().min(INT32_MIN).max(INT32_MAX),
  val3: z.number().int().min(INT32_MIN).max(INT32_MAX),
  vnum: vnumSchema,
  volume: z.number().int().min(0).max(50_000),
  wear_flag: z.number().int().min(INT32_MIN).max(INT32_MAX),
  weight: z.number().min(0).max(500_000),
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
