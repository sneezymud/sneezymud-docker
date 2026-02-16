import type { RowDataPacket } from "mysql2/promise";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Obj, ObjListItem } from "@/shared/schemas/obj.ts";

import { immortalPool } from "../db.ts";

interface ObjRow extends RowDataPacket {
  action_desc: string;
  action_flag: number;
  can_be_seen: number;
  cur_struct: number;
  decay: number;
  long_desc: string;
  material: number;
  max_exist: number;
  max_struct: number;
  name: string;
  price: number;
  short_desc: string;
  spec_proc: number;
  type: number;
  val0: number;
  val1: number;
  val2: number;
  val3: number;
  vnum: number;
  volume: number;
  wear_flag: number;
  weight: number;
}

interface ObjAffectRow extends RowDataPacket {
  mod1: number;
  mod2: number;
  type: number;
  vnum: number;
}

interface ObjExtraRow extends RowDataPacket {
  description: string;
  name: string;
  vnum: number;
}

export async function listObjects(blocks: VnumBlock[]): Promise<ObjListItem[]> {
  if (blocks.length === 0) {
    return [];
  }

  const conditions = blocks.map(() => "(vnum >= ? AND vnum <= ?)").join(" OR ");
  const params = blocks.flatMap((b) => [b.start, b.end]);

  const [rows] = await immortalPool.execute<ObjRow[]>(
    `SELECT vnum, name, short_desc FROM obj WHERE ${conditions} ORDER BY vnum`,
    params,
  );

  return rows.map((r) => ({
    name: r.name,
    short_desc: r.short_desc,
    vnum: r.vnum,
  }));
}

export async function getObject(vnum: number): Promise<null | Obj> {
  const [objects] = await immortalPool.execute<ObjRow[]>(
    "SELECT * FROM obj WHERE vnum = ?",
    [vnum],
  );

  const row = objects[0];
  if (!row) {
    return null;
  }

  const [[affects], [extras]] = await Promise.all([
    immortalPool.execute<ObjAffectRow[]>(
      "SELECT * FROM objaffect WHERE vnum = ?",
      [vnum],
    ),
    immortalPool.execute<ObjExtraRow[]>(
      "SELECT * FROM objextra WHERE vnum = ?",
      [vnum],
    ),
  ]);

  return {
    action_desc: row.action_desc,
    action_flag: row.action_flag,
    affects: affects.map((a) => ({
      mod1: a.mod1,
      mod2: a.mod2,
      type: a.type,
      vnum: a.vnum,
    })),
    can_be_seen: row.can_be_seen,
    cur_struct: row.cur_struct,
    decay: row.decay,
    extras: extras.map((e) => ({
      description: e.description,
      name: e.name,
      vnum: e.vnum,
    })),
    long_desc: row.long_desc,
    material: row.material,
    max_exist: row.max_exist,
    max_struct: row.max_struct,
    name: row.name,
    price: row.price,
    short_desc: row.short_desc,
    spec_proc: row.spec_proc,
    type: row.type,
    val0: row.val0,
    val1: row.val1,
    val2: row.val2,
    val3: row.val3,
    vnum: row.vnum,
    volume: row.volume,
    wear_flag: row.wear_flag,
    weight: row.weight,
  };
}

export async function createObject(vnum: number, owner: string): Promise<void> {
  await immortalPool.execute(
    `INSERT INTO obj (vnum, owner, name, short_desc, long_desc, action_desc,
       type, action_flag, wear_flag, val0, val1, val2, val3, weight, price,
       can_be_seen, spec_proc, max_exist, max_struct, cur_struct, decay, volume, material)
     VALUES (?, ?, '', '', '', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
    [vnum, owner],
  );
}

export async function updateObject(
  vnum: number,
  obj: Obj,
  owner: string,
): Promise<void> {
  const conn = await immortalPool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE obj SET name = ?, short_desc = ?, long_desc = ?, action_desc = ?,
         type = ?, action_flag = ?, wear_flag = ?, val0 = ?, val1 = ?, val2 = ?, val3 = ?,
         weight = ?, price = ?, can_be_seen = ?, spec_proc = ?, max_exist = ?,
         max_struct = ?, cur_struct = ?, decay = ?, volume = ?, material = ?
       WHERE vnum = ?`,
      [
        obj.name,
        obj.short_desc,
        obj.long_desc,
        obj.action_desc,
        obj.type,
        obj.action_flag,
        obj.wear_flag,
        obj.val0,
        obj.val1,
        obj.val2,
        obj.val3,
        obj.weight,
        obj.price,
        obj.can_be_seen,
        obj.spec_proc,
        obj.max_exist,
        obj.max_struct,
        obj.cur_struct,
        obj.decay,
        obj.volume,
        obj.material,
        vnum,
      ],
    );

    // Replace affects atomically
    await conn.execute("DELETE FROM objaffect WHERE vnum = ?", [vnum]);
    for (const affect of obj.affects) {
      await conn.execute(
        `INSERT INTO objaffect (vnum, owner, type, mod1, mod2)
         VALUES (?, ?, ?, ?, ?)`,
        [vnum, owner, affect.type, affect.mod1, affect.mod2],
      );
    }

    // Replace extras atomically
    await conn.execute("DELETE FROM objextra WHERE vnum = ?", [vnum]);
    for (const extra of obj.extras) {
      await conn.execute(
        `INSERT INTO objextra (vnum, owner, name, description)
         VALUES (?, ?, ?, ?)`,
        [vnum, owner, extra.name, extra.description],
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

export async function deleteObject(vnum: number): Promise<void> {
  const conn = await immortalPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM objaffect WHERE vnum = ?", [vnum]);
    await conn.execute("DELETE FROM objextra WHERE vnum = ?", [vnum]);
    await conn.execute("DELETE FROM obj WHERE vnum = ?", [vnum]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function objectExists(vnum: number): Promise<boolean> {
  const [rows] = await immortalPool.execute<RowDataPacket[]>(
    "SELECT 1 FROM obj WHERE vnum = ? LIMIT 1",
    [vnum],
  );
  return rows.length > 0;
}
