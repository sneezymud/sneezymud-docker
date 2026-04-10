import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";

import { app } from "../app.ts";
import { immortalDb } from "../db.ts";
import { authRequest, getAuthCookie } from "../test-helpers.ts";

let cookie: string;

beforeAll(async () => {
  cookie = await getAuthCookie(app, "testbuilder");

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

describe("auth enforcement", () => {
  test("unauthenticated GET returns 401", async () => {
    const res = await app.request("/api/mob-responses/130", {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    expect(res.status).toBe(401);
  });

  test("request without X-Requested-With header returns 403", async () => {
    const res = await app.request("/api/mob-responses/130", {
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(403);
  });
});

describe("mob responses", () => {
  test("get response for mob with no response returns empty string", async () => {
    const res = await authRequest(app, "/api/mob-responses/130", cookie);

    expect(res.status).toBe(200);
    const body: unknown = await res.json();
    expect(body).toEqual(expect.objectContaining({ response: "", vnum: 130 }));
  });

  test("set response via PUT and retrieve it via GET", async () => {
    const response = 'say {"hello";\nsmile %n;\n}';
    const putRes = await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response, vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    expect(putRes.status).toBe(200);
    const putBody: unknown = await putRes.json();
    expect(putBody).toHaveProperty("response", response);

    const getRes = await authRequest(app, "/api/mob-responses/130", cookie);

    expect(getRes.status).toBe(200);
    const getBody: unknown = await getRes.json();
    expect(getBody).toHaveProperty("response", response);
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

  test("saving the same response twice produces identical data", async () => {
    const response = 'roomenter {\nwave;\n}\nsay {"greetings";\nsmile %n;\n}';

    // First PUT
    await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response, vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });

    // Second PUT with identical payload
    const putRes = await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ response, vnum: 130 }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(putRes.status).toBe(200);

    // GET and verify no duplication or corruption
    const getRes = await authRequest(app, "/api/mob-responses/130", cookie);
    expect(getRes.status).toBe(200);
    const body: unknown = await getRes.json();
    expect(body).toHaveProperty("response", response);
    expect(body).toHaveProperty("vnum", 130);
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

  test("PUT with invalid body returns 400", async () => {
    const res = await authRequest(app, "/api/mob-responses/130", cookie, {
      body: JSON.stringify({ wrong_field: "test" }),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    });
    expect(res.status).toBe(400);
  });
});
