import { z } from "zod";

export const mobResponseSchema = z.object({
  response: z.string(),
  vnum: z.number().int(),
});

export type MobResponse = z.infer<typeof mobResponseSchema>;
