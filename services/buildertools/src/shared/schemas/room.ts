import { z } from "zod";

export const roomExitSchema = z.object({
  block: z.number().int(),
  condition_flag: z.number().int(),
  description: z.string(),
  destination: z.number().int(),
  direction: z.number().int().gte(0).lte(5),
  key_num: z.number().int(),
  lock_difficulty: z.number().int(),
  name: z.string(),
  type: z.number().int(),
  vnum: z.number().int(),
  weight: z.number().int(),
});

export type RoomExit = z.infer<typeof roomExitSchema>;

export const roomSchema = z.object({
  capacity: z.number().int(),
  description: z.string(),
  exits: z.array(roomExitSchema),
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
  vnum: z.number().int(),
  x: z.number().int(),
  y: z.number().int(),
  z: z.number().int(),
  zone: z.number().int(),
});

export type Room = z.infer<typeof roomSchema>;

export const roomListItemSchema = z.object({
  name: z.string(),
  vnum: z.number().int(),
});

export type RoomListItem = z.infer<typeof roomListItemSchema>;

export const roomListSchema = z.array(roomListItemSchema);

export const roomUpdateSchema = roomSchema.omit({ vnum: true });

export type RoomUpdate = z.infer<typeof roomUpdateSchema>;

export const roomCreateSchema = z.object({
  vnum: z.number().int(),
});

export type RoomCreate = z.infer<typeof roomCreateSchema>;
