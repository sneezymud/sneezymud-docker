import { z } from "zod";

import { mobResponseSchema } from "./mob-response.ts";
import { mobSchema } from "./mob.ts";
import { objSchema } from "./obj.ts";
import { roomSchema } from "./room.ts";

export const roomDiffSchema = z.object({
  immortal: roomSchema.nullable(),
  production: roomSchema.nullable(),
});

export type RoomDiff = z.infer<typeof roomDiffSchema>;

export const mobDiffSchema = z.object({
  immortal: mobSchema.nullable(),
  production: mobSchema.nullable(),
});

export type MobDiff = z.infer<typeof mobDiffSchema>;

export const objDiffSchema = z.object({
  immortal: objSchema.nullable(),
  production: objSchema.nullable(),
});

export type ObjDiff = z.infer<typeof objDiffSchema>;

export const mobResponseDiffSchema = z.object({
  immortal: mobResponseSchema.nullable(),
  production: mobResponseSchema.nullable(),
});

export type MobResponseDiff = z.infer<typeof mobResponseDiffSchema>;

export const bulkPublishSchema = z.object({
  entities: z.array(
    z.object({
      type: z.enum(["mob", "mob-response", "object", "room"]),
      vnum: z.number().int(),
    }),
  ),
});

export type BulkPublishRequest = z.infer<typeof bulkPublishSchema>;

export const dashboardEntitySchema = z.object({
  name: z.string(),
  owner: z.string(),
  status: z.enum(["new", "modified"]),
  type: z.enum(["mob", "object", "room"]),
  vnum: z.number().int(),
});

export type DashboardEntity = z.infer<typeof dashboardEntitySchema>;

export const dashboardResponseSchema = z.array(dashboardEntitySchema);
