import { z } from "zod";

export const vnumSchema = z.number().int().nonnegative();

export type Vnum = z.infer<typeof vnumSchema>;

const apiIssueSchema = z.object({
  message: z.string(),
  path: z.array(z.string()),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  issues: z.array(apiIssueSchema).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const bulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  ok: z.boolean(),
});
