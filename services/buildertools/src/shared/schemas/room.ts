import { z } from "zod";

import { INT32_MAX, INT32_MIN } from "@/shared/constants.ts";

import { playerIdSchema, vnumSchema } from "./common.ts";

export const roomExitSchema = z.object({
  block: z.number().int().nullable(),
  condition_flag: z.number().int().min(INT32_MIN).max(INT32_MAX),
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
  name: z.string().max(127),
  type: z.number().int(),
  vnum: vnumSchema,
  weight: z.number().int().min(0).max(50),
});

export type RoomExit = z.infer<typeof roomExitSchema>;

export const roomExtraSchema = z.object({
  description: z.string(),
  name: z.string().max(255),
  vnum: vnumSchema,
});

export type RoomExtra = z.infer<typeof roomExtraSchema>;

export const roomSchema = z.object({
  capacity: z.number().int(),
  description: z.string(),
  exits: z.array(roomExitSchema),
  extras: z.array(roomExtraSchema),
  height: z.number().int(),
  name: z.string(),
  river_dir: z.number().int(),
  river_speed: z.number().int(),
  room_flag: z.number().int(),
  sector: z.number().int(),
  spec: z.number().int(),
  telelook: z.number().int(),
  teletarg: z.number().int(),
  teletime: z.number().int(),
  vnum: vnumSchema,
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  zone: z.number().int().nullable(),
});

export type Room = z.infer<typeof roomSchema>;

// Redit-matching range constraints for write validation
export const roomInputSchema = roomSchema.extend({
  capacity: z.number().int().min(0).max(100),
  height: z.number().int().min(-1).max(1000),
  name: z.string().max(127),
  river_dir: z.number().int().min(-1).max(9),
  river_speed: z.number().int().min(0).max(200),
  room_flag: z.number().int().min(INT32_MIN).max(INT32_MAX),
  sector: z.number().int().min(0).max(61),
  spec: z.number().int().min(0).max(34),
  telelook: z.number().int().min(0).max(1),
  teletarg: z.number().int().min(0).max(49_999),
  teletime: z.number().int().min(0).max(10_000),
  x: z.number().int().min(-1000).max(1000),
  y: z.number().int().min(-1000).max(1000),
  z: z.number().int().min(-1000).max(1000),
  zone: z.number().int().min(0).max(500).nullable(),
});

export type RoomInput = z.infer<typeof roomInputSchema>;

export const roomListItemSchema = z.object({
  name: z.string(),
  owner: z.string().optional(),
  player_id: playerIdSchema.optional(),
  sector: z.number(),
  vnum: vnumSchema,
});

export type RoomListItem = z.infer<typeof roomListItemSchema>;

export const roomListSchema = z.array(roomListItemSchema);

export const roomUpdateSchema = roomInputSchema.omit({ vnum: true });

export type RoomUpdate = z.infer<typeof roomUpdateSchema>;

export const roomCreateSchema = z.object({
  vnum: vnumSchema,
});

export type RoomCreate = z.infer<typeof roomCreateSchema>;
