import { Hono } from "hono";

import { bulkDeleteSchema } from "@/shared/schemas/common.ts";
import { roomCreateSchema, roomInputSchema } from "@/shared/schemas/room.ts";

import {
  type AuthEnv,
  jsonValidator,
  requireAuth,
  requireVnumAccess,
} from "../auth/middleware.ts";
import { isDuplicateKeyError } from "../db.ts";
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
  const scope = { owner: user.playerName };
  const rooms = await listRooms(user.blocks, scope);
  return c.json(rooms);
});

roomRoutes.post("/", jsonValidator(roomCreateSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const data = c.req.valid("json");

  if (!isVnumInBlocks(data.vnum, user.blocks)) {
    return c.json({ error: "Vnum outside assigned blocks" }, 403);
  }

  if (await roomExists(data.vnum, scope)) {
    return c.json({ error: "Room already exists" }, 409);
  }

  const blockIndex = user.blocks.findIndex(
    (b) => data.vnum >= b.start && data.vnum <= b.end,
  );
  try {
    await createRoom(data.vnum, scope, blockIndex + 1);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return c.json({ error: "Room already exists" }, 409);
    }
    throw error;
  }
  const room = await getRoom(data.vnum, scope);
  return c.json(room, 201);
});

roomRoutes.get("/search", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const query = c.req.query("q") ?? "";
  if (query.length < 2) {
    return c.json([]);
  }
  const results = await searchRooms(query, scope);
  return c.json(results);
});

roomRoutes.get("/name/:vnum", async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));
  const name = await getRoomName(vnum, scope);
  return c.json({ name, vnum });
});

roomRoutes.get("/:vnum", requireVnumAccess, async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  const room = await getRoom(vnum, scope);
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
    const scope = { owner: user.playerName };
    const vnum = Number(c.req.param("vnum"));

    if (!(await roomExists(vnum, scope))) {
      return c.json({ error: "Room not found" }, 404);
    }

    const data = c.req.valid("json");

    // Determine which block this vnum belongs to for the owner field
    const blockIndex = user.blocks.findIndex(
      (b) => vnum >= b.start && vnum <= b.end,
    );
    const block = blockIndex + 1; // 1-indexed block number

    await updateRoom(vnum, data, scope, block);
    const updated = await getRoom(vnum, scope);
    return c.json(updated);
  },
);

roomRoutes.delete("/bulk", jsonValidator(bulkDeleteSchema), async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const { vnums } = c.req.valid("json");

  const unauthorized = vnums.filter((v) => !isVnumInBlocks(v, user.blocks));
  if (unauthorized.length > 0) {
    return c.json(
      { error: `Vnums outside assigned blocks: ${unauthorized.join(", ")}` },
      403,
    );
  }

  const deleted = await deleteRooms(vnums, scope);
  return c.json({ deleted, ok: true });
});

roomRoutes.delete("/:vnum", requireVnumAccess, async (c) => {
  const user = c.get("user");
  const scope = { owner: user.playerName };
  const vnum = Number(c.req.param("vnum"));

  if (!(await roomExists(vnum, scope))) {
    return c.json({ error: "Room not found" }, 404);
  }

  await deleteRoom(vnum, scope);
  return c.json({ ok: true });
});
