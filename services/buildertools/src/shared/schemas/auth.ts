import { z } from "zod";

export const loginRequestSchema = z.object({
  password: z.string().min(1, { error: "Password is required" }),
  username: z.string().min(1, { error: "Username is required" }),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const vnumBlockSchema = z.object({
  end: z.number().int(),
  start: z.number().int(),
});

export type VnumBlock = z.infer<typeof vnumBlockSchema>;

export const sessionUserSchema = z.object({
  blocks: z.array(vnumBlockSchema),
  playerName: z.string(),
  username: z.string(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
