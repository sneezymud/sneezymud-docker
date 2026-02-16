import type { Context } from "hono";

import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import type { SessionUser } from "@/shared/schemas/auth.ts";

import { sessionUserSchema } from "@/shared/schemas/auth.ts";

const SESSION_COOKIE = "bt_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours
// Random secret per process — sessions don't survive restarts, which is fine
// for a 24h TTL. Set BT_SESSION_SECRET for persistence across restarts.
const SECRET =
  process.env["BT_SESSION_SECRET"] ?? randomBytes(32).toString("hex");

const tokenPayloadSchema = z.object({
  expiresAt: z.number(),
  user: sessionUserSchema,
});

type TokenPayload = z.infer<typeof tokenPayloadSchema>;

export function createSession(c: Context, user: SessionUser): void {
  const token = sign({
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    user,
  });
  setSessionCookie(c, token);
}

export function destroySession(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

export function getSession(c: Context): null | SessionUser {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return null;
  }
  const payload = verify(token);
  if (!payload) {
    return null;
  }
  return payload.user;
}

export function touchSession(c: Context): void {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return;
  }
  const payload = verify(token);
  if (!payload) {
    return;
  }
  const refreshed = sign({
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    user: payload.user,
  });
  setSessionCookie(c, refreshed);
}

function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "Lax",
  });
}

function sign(payload: TokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verify(token: string): null | TokenPayload {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) {
    return null;
  }
  const data = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  const expected = createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (sig.length !== expected.length) {
    return null;
  }
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const raw: unknown = JSON.parse(Buffer.from(data, "base64url").toString());
    const parsed = tokenPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    if (Date.now() > parsed.data.expiresAt) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}
