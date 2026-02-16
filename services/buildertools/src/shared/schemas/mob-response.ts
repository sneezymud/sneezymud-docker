import { z } from "zod";

import { vnumSchema } from "./common.ts";

export const mobResponseSchema = z.object({
  response: z.string(),
  vnum: vnumSchema,
});

export type MobResponse = z.infer<typeof mobResponseSchema>;
