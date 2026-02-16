import { Hono } from "hono";

import { roomCreateSchema, roomSchema } from "@/shared/schemas/room.ts";

import { type AuthEnv, requireAuth } from "../auth/middleware.ts";
import {
  createRoom,
  deleteRoom,
  getRoom,
  getRoomName,
  listRooms,
  roomExists,
  searchRooms,
  updateRoom,
} from "../queries/rooms.ts";
import { isVnumInBlocks } from "../queries/vnum-access.ts";

export const roomRoutes = new Hono<AuthEnv>();

roomRoutes.use(requireAuth);

roomRoutes.get("/", async (c) => {
  const user = c.get("user");
  const rooms = await listRooms(user.blocks);
  return c.json(rooms);
});

roomRoutes.post("/", async (c) => {
  const user = c.get("user");
  const body: unknown = await c.req.json();
  const parsed = roomCreateSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          message: i.message,
          path: i.path.map(String),
        })),
      },
      400,
    );
  }

  if (!isVnumInBlocks(parsed.data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await roomExists(parsed.data.vnum)) {
    return c.json({ error: "Room already exists" }, 409);
  }

  await createRoom(parsed.data.vnum, user.playerName);
  const room = await getRoom(parsed.data.vnum);
  return c.json(room, 201);
});

roomRoutes.get("/search", async (c) => {
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchRooms(query);
  return c.json(results);
});

roomRoutes.get("/name/:vnum", async (c) => {
  const vnum = Number(c.req.param("vnum"));
  const name = await getRoomName(vnum);
  return c.json({ name, vnum });
});

roomRoutes.get("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  const room = await getRoom(vnum);
  if (!room) {
    return c.json({ error: "Room not found" }, 404);
  }

  return c.json(room);
});

roomRoutes.put("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await roomExists(vnum))) {
    return c.json({ error: "Room not found" }, 404);
  }

  const body: unknown = await c.req.json();
  const parsed = roomSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((i) => ({
          message: i.message,
          path: i.path.map(String),
        })),
      },
      400,
    );
  }

  // Determine which block this vnum belongs to for the owner field
  const blockIndex = user.blocks.findIndex(
    (b) => vnum >= b.start && vnum <= b.end,
  );
  const block = blockIndex + 1; // 1-indexed block number

  await updateRoom(vnum, parsed.data, user.playerName, block);
  const updated = await getRoom(vnum);
  return c.json(updated);
});

roomRoutes.delete("/:vnum", async (c) => {
  const user = c.get("user");
  const vnum = Number(c.req.param("vnum"));

  if (!isVnumInBlocks(vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (!(await roomExists(vnum))) {
    return c.json({ error: "Room not found" }, 404);
  }

  await deleteRoom(vnum);
  return c.json({ ok: true });
});
