import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import { authRequest, getAuthCookie } from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app);

  // Create a mob to attach responses to
  await authRequest(app, "/api/mobs", cookie, {
    body: JSON.stringify({ vnum: 130 }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
});

afterAll(async () => {
  await immortalDb.execute(sql`DELETE FROM mobresponses WHERE vnum = 130`);
  await immortalDb.execute(sql`DELETE FROM mob_extra WHERE vnum = 130`);
  await immortalDb.execute(sql`DELETE FROM mob_imm WHERE vnum = 130`);
  await immortalDb.execute(sql`DELETE FROM mob WHERE vnum = 130`);
});

describe("mob responses", () => {
  test("get response for mob with no response returns empty string", async () => {
    const res = await authRequest(app, "/api/mob-responses/130", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ response: "", vnum: 130 }));
  });

  test("set response via PUT", async () => {
    const response = 'say {"hello";\nsmile %n;\n}';
    const res = await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response, vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("response", response);
  });

  test("get response returns previously set value", async () => {
    const res = await authRequest(app, "/api/mob-responses/130", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("response", expect.stringContaining("hello"));
  });

  test("clear response by sending empty string", async () => {
    const res = await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response: "", vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ response: "", vnum: 130 }));
  });

  test("whitespace-only response is treated as empty and deletes the row", async () => {
    // First set a real response
    await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response: "say {hello;}", vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Send whitespace-only - should delete the response row
    const res = await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response: "   \t\n  ", vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ response: "", vnum: 130 }));
  });

  test("response for nonexistent mob returns 404", async () => {
    const res = await authRequest(app, "/api/mob-responses/199", cookie);

    expect(res.status).toBe(404);
    const body: unknown = await res.json();
    expect(body).toHaveProperty("error", "Mob not found");
  });

  test("response for mob outside blocks returns 403", async () => {
    const res = await authRequest(app, "/api/mob-responses/500", cookie);

    expect(res.status).toBe(403);
  });
});
