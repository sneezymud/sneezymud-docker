import { z } from "zod";

export const vnumSchema = z.number().int().nonnegative();

export type Vnum = z.infer<typeof vnumSchema>;

/**
 * Player IDs are the primary key in sneezy.player. They are always positive
 * integers in production. Distinct from vnumSchema (which allows 0 because
 * some vnums use 0 for sentinel/default values).
 *
 * Use this schema for JSON bodies where the value already arrives as a number.
 */
export const playerIdSchema = z.number().int().positive();

/**
 * Coerced variant for URL query params and TanStack Router `validateSearch`.
 * URL params always arrive as strings, so `z.number()` would reject them;
 * `z.coerce.number()` parses the string to a number before applying the
 * positive-integer check.
 */
export const playerIdParamSchema = z.coerce.number().int().positive();

const apiIssueSchema = z.object({
  message: z.string(),
  path: z.array(z.string()),
});

export const apiErrorSchema = z.object({
  error: z.string(),
  issues: z.array(apiIssueSchema).optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export const bulkDeleteSchema = z.object({
  vnums: z.array(vnumSchema).min(1).max(200),
});

export const bulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  ok: z.boolean(),
});

export const okResponseSchema = z.object({ ok: z.boolean() });
