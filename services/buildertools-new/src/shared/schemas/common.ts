import { z } from "zod";

export const vnumSchema = z.number().int().nonnegative();

export type Vnum = z.infer<typeof vnumSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
