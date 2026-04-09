import { z } from "zod";

export const zoneSchema = z.object({
  age: z.number().int().nullable(),
  bottom: z.number().int().nullable(),
  lifespan: z.number().int().nullable(),
  reset_mode: z.number().int().nullable(),
  top: z.number().int().nullable(),
  util_flag: z.number().int().nullable(),
  zone_enabled: z.number().int(),
  zone_name: z.string(),
  zone_nr: z.number().int(),
});

export type Zone = z.infer<typeof zoneSchema>;

export const zoneListSchema = z.array(zoneSchema);
