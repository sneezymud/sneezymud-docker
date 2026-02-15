import type { Context } from "hono";

import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import type { SessionUser } from "@/shared/schemas/auth.ts";

const SESSION_COOKIE = "bt_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

const sessions = new Map<string, { expiresAt: number; user: SessionUser }>();

export function createSession(c: Context, user: SessionUser): void {
  const id = generateId();
  sessions.set(id, {
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    user,
  });
  setCookie(c, SESSION_COOKIE, id, {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "Lax",
  });
}

export function getSession(c: Context): null | SessionUser {
  const id = getCookie(c, SESSION_COOKIE);
  if (!id) {
    return null;
  }
  const session = sessions.get(id);
  if (!session) {
    return null;
  }
  if (Date.now() > session.expiresAt) {
    sessions.delete(id);
    return null;
  }
  return session.user;
}

export function destroySession(c: Context): void {
  const id = getCookie(c, SESSION_COOKIE);
  if (id) {
    sessions.delete(id);
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
}

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
