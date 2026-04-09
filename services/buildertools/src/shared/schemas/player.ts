import { z } from "zod";

import { playerIdSchema } from "./common.ts";

export const playerResponseSchema = z.object({
  id: playerIdSchema,
  name: z.string(),
});

export type PlayerResponse = z.infer<typeof playerResponseSchema>;
