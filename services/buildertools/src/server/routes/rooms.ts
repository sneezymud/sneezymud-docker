import { Hono } from "hono";
import { z } from "zod";

import { roomCreateSchema, roomInputSchema } from "@/shared/schemas/room.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
} from "../auth/middleware.ts";
import {
  createRoom,
  deleteRoom,
  deleteRooms,
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

roomRoutes.post("/", jsonValidator(roomCreateSchema), async (c) => {
  const user = c.get("user");
  const data = c.req.valid("json");

  if (!isVnumInBlocks(data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await roomExists(data.vnum)) {
    return c.json({ error: "Room already exists" }, 409);
  }

  await createRoom(data.vnum, user.playerName);
  const room = await getRoom(data.vnum);
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

roomRoutes.get("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  const room = await getRoom(vnum);
  if (!room) {
    return c.json({ error: "Room not found" }, 404);
  }

  return c.json(room);
});

roomRoutes.put(
  "/:vnum",
  requireVnumAccess,
  jsonValidator(roomInputSchema),
  async (c) => {
    const user = c.get("user");
    const vnum = Number(c.req.param("vnum"));

    if (!(await roomExists(vnum))) {
      return c.json({ error: "Room not found" }, 404);
    }

    const data = c.req.valid("json");

    // Determine which block this vnum belongs to for the owner field
    const blockIndex = user.blocks.findIndex(
      (b) => vnum >= b.start && vnum <= b.end,
    );
    const block = blockIndex + 1; // 1-indexed block number

    await updateRoom(vnum, data, user.playerName, block);
    const updated = await getRoom(vnum);
    return c.json(updated);
  },
);

const bulkDeleteSchema = z.object({
  vnums: z.array(z.number().int()).min(1).max(200),
});

roomRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const { vnums } = c.req.valid("json");

  const unauthorized = vnums.filter((v) => !isVnumInBlocks(v, user.blocks));
  if (unauthorized.length > 0) {
    return c.json(
      { error: `Vnums outside assigned blocks: ${unauthorized.join(", ")}` },
      403,
    );
  }

  const deleted = await deleteRooms(vnums);
  return c.json({ deleted, ok: true });
});

roomRoutes.delete("/:vnum", requireVnumAccess, async (c) => {
  const vnum = Number(c.req.param("vnum"));

  if (!(await roomExists(vnum))) {
    return c.json({ error: "Room not found" }, 404);
  }

  await deleteRoom(vnum);
  return c.json({ ok: true });
});
