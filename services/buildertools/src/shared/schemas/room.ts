import { z } from "zod";

import { vnumSchema } from "./common.ts";

export const roomExitSchema = z.object({
  block: z.number().int(),
  condition_flag: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  description: z.string(),
  destination: z.number().int().min(0).max(49_999),
  direction: z.number().int().gte(0).lte(9),
  key_num: z
    .number()
    .int()
    .min(-1)
    .refine((v) => v !== 0, {
      message: "Use -1 for no key, or enter a positive object vnum",
    }),
  lock_difficulty: z.number().int().min(0).max(100),
  name: z.string(),
  type: z.number().int(),
  vnum: vnumSchema,
  weight: z.number().int().min(0).max(50),
});

export type RoomExit = z.infer<typeof roomExitSchema>;

export const roomExtraSchema = z.object({
  description: z.string(),
  name: z.string(),
  vnum: vnumSchema,
});

export type RoomExtra = z.infer<typeof roomExtraSchema>;

export const roomSchema = z.object({
  capacity: z.number().int().min(0).max(100),
  description: z.string(),
  exits: z.array(roomExitSchema),
  extras: z.array(roomExtraSchema),
  height: z.number().int().min(-1).max(1000),
  name: z.string(),
  river_dir: z.number().int(),
  river_speed: z.number().int(),
  room_flag: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  sector: z.number().int(),
  spec: z.number().int().min(0).max(34),
  telelook: z.number().int(),
  teletarg: z.number().int(),
  teletime: z.number().int(),
  vnum: vnumSchema,
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  zone: z.number().int(),
});

export type Room = z.infer<typeof roomSchema>;

export const roomListItemSchema = z.object({
  name: z.string(),
  vnum: vnumSchema,
});

export type RoomListItem = z.infer<typeof roomListItemSchema>;

export const roomListSchema = z.array(roomListItemSchema);

export const roomUpdateSchema = roomSchema.omit({ vnum: true });

export type RoomUpdate = z.infer<typeof roomUpdateSchema>;

export const roomCreateSchema = z.object({
  vnum: vnumSchema,
});

export type RoomCreate = z.infer<typeof roomCreateSchema>;
