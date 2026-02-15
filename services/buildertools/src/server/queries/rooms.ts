import type { RowDataPacket } from "mysql2/promise";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Room, RoomListItem } from "@/shared/schemas/room.ts";

import { immortalPool, sneezyPool } from "../db.ts";

interface RoomRow extends RowDataPacket {
  capacity: number;
  description: string;
  height: number;
  name: string;
  river_dir: number;
  river_speed: number;
  room_flag: number;
  sector: number;
  spec: number;
  telelook: number;
  teletarg: number;
  teletime: number;
  vnum: number;
  x: number;
  y: number;
  z: number;
  zone: number;
}

interface ExitRow extends RowDataPacket {
  block: number;
  condition_flag: number;
  description: string;
  destination: number;
  direction: number;
  key_num: number;
  lock_difficulty: number;
  name: string;
  type: number;
  vnum: number;
  weight: number;
}

export async function listRooms(blocks: VnumBlock[]): Promise<RoomListItem[]> {
  if (blocks.length === 0) {
    return [];
  }

  const conditions = blocks.map(() => "(vnum >= ? AND vnum <= ?)").join(" OR ");
  const params = blocks.flatMap((b) => [b.start, b.end]);

  const [rows] = await immortalPool.execute<RoomRow[]>(
    `SELECT vnum, name FROM room WHERE ${conditions} ORDER BY vnum`,
    params,
  );

  return rows.map((r) => ({ name: r.name, vnum: r.vnum }));
}

export async function getRoom(vnum: number): Promise<null | Room> {
  const [rooms] = await immortalPool.execute<RoomRow[]>(
    "SELECT * FROM room WHERE vnum = ?",
    [vnum],
  );

  const row = rooms[0];
  if (!row) {
    return null;
  }

  const [exits] = await immortalPool.execute<ExitRow[]>(
    "SELECT * FROM roomexit WHERE vnum = ? ORDER BY direction",
    [vnum],
  );

  return {
    capacity: row.capacity,
    description: row.description,
    exits: exits.map((e) => ({
      block: e.block,
      condition_flag: e.condition_flag,
      description: e.description,
      destination: e.destination,
      direction: e.direction,
      key_num: e.key_num,
      lock_difficulty: e.lock_difficulty,
      name: e.name,
      type: e.type,
      vnum: e.vnum,
      weight: e.weight,
    })),
    height: row.height,
    name: row.name,
    river_dir: row.river_dir,
    river_speed: row.river_speed,
    room_flag: row.room_flag,
    sector: row.sector,
    spec: row.spec,
    telelook: row.telelook,
    teletarg: row.teletarg,
    teletime: row.teletime,
    vnum: row.vnum,
    x: row.x,
    y: row.y,
    z: row.z,
    zone: row.zone,
  };
}

export async function createRoom(vnum: number, owner: string): Promise<void> {
  await immortalPool.execute(
    `INSERT INTO room (vnum, x, y, z, name, description, zone, room_flag, sector,
       teletime, teletarg, telelook, river_speed, river_dir, capacity, height, spec, owner)
     VALUES (?, 0, 0, 0, '', '', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?)`,
    [vnum, owner],
  );
}

export async function updateRoom(
  vnum: number,
  room: Room,
  owner: string,
  block: number,
): Promise<void> {
  const conn = await immortalPool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE room SET name = ?, description = ?, zone = ?, room_flag = ?, sector = ?,
         teletime = ?, teletarg = ?, telelook = ?, river_speed = ?, river_dir = ?,
         capacity = ?, height = ?, spec = ?, x = ?, y = ?, z = ?
       WHERE vnum = ?`,
      [
        room.name,
        room.description,
        room.zone,
        room.room_flag,
        room.sector,
        room.teletime,
        room.teletarg,
        room.telelook,
        room.river_speed,
        room.river_dir,
        room.capacity,
        room.height,
        room.spec,
        room.x,
        room.y,
        room.z,
        vnum,
      ],
    );

    // Replace all exits atomically
    await conn.execute("DELETE FROM roomexit WHERE vnum = ?", [vnum]);

    for (const exit of room.exits) {
      await conn.execute(
        `INSERT INTO roomexit (vnum, direction, name, description, type, condition_flag,
           lock_difficulty, weight, key_num, destination, owner, block)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vnum,
          exit.direction,
          exit.name,
          exit.description,
          exit.type,
          exit.condition_flag,
          exit.lock_difficulty,
          exit.weight,
          exit.key_num,
          exit.destination,
          owner,
          block,
        ],
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteRoom(vnum: number): Promise<void> {
  const conn = await immortalPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM roomexit WHERE vnum = ?", [vnum]);
    await conn.execute("DELETE FROM room WHERE vnum = ?", [vnum]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getRoomName(vnum: number): Promise<null | string> {
  // Try immortal first (builder workspace), then sneezy (production)
  // Exits can point to rooms outside the builder's assigned blocks
  const [immortalRows] = await immortalPool.execute<RoomRow[]>(
    "SELECT name FROM room WHERE vnum = ? LIMIT 1",
    [vnum],
  );
  const immortalRow = immortalRows[0];
  if (immortalRow) {
    return immortalRow.name;
  }

  const [sneezyRows] = await sneezyPool.execute<RoomRow[]>(
    "SELECT name FROM room WHERE vnum = ? LIMIT 1",
    [vnum],
  );
  const sneezyRow = sneezyRows[0];
  if (sneezyRow) {
    return sneezyRow.name;
  }

  return null;
}

export async function roomExists(vnum: number): Promise<boolean> {
  const [rows] = await immortalPool.execute<RowDataPacket[]>(
    "SELECT 1 FROM room WHERE vnum = ? LIMIT 1",
    [vnum],
  );
  return rows.length > 0;
}
