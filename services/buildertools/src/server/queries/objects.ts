import { and, eq, gte, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Obj, ObjListItem } from "@/shared/schemas/obj.ts";

import { immortalDb } from "../db.ts";
import { obj, objaffect, objextra } from "../schema/immortal.ts";

export async function listObjects(blocks: VnumBlock[]): Promise<ObjListItem[]> {
  if (blocks.length === 0) {
    return [];
  }

  return immortalDb
    .select({ name: obj.name, short_desc: obj.short_desc, vnum: obj.vnum })
    .from(obj)
    .where(
      or(
        ...blocks.map((b) => and(gte(obj.vnum, b.start), lte(obj.vnum, b.end))),
      ),
    )
    .orderBy(obj.vnum);
}

export async function getObject(vnum: number): Promise<null | Obj> {
  const [row] = await immortalDb.select().from(obj).where(eq(obj.vnum, vnum));

  if (!row) {
    return null;
  }

  const [affects, extras] = await Promise.all([
    immortalDb.select().from(objaffect).where(eq(objaffect.vnum, vnum)),
    immortalDb.select().from(objextra).where(eq(objextra.vnum, vnum)),
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
  await immortalDb.insert(obj).values({
    action_desc: "",
    action_flag: 0,
    can_be_seen: 0,
    cur_struct: 0,
    decay: 0,
    long_desc: "",
    material: 0,
    max_exist: 0,
    max_struct: 0,
    name: "",
    owner,
    price: 0,
    short_desc: "",
    spec_proc: 0,
    type: 0,
    val0: 0,
    val1: 0,
    val2: 0,
    val3: 0,
    vnum,
    volume: 0,
    wear_flag: 0,
    weight: 0,
  });
}

export async function updateObject(
  vnum: number,
  data: Obj,
  owner: string,
): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx
      .update(obj)
      .set({
        action_desc: data.action_desc,
        action_flag: data.action_flag,
        can_be_seen: data.can_be_seen,
        cur_struct: data.cur_struct,
        decay: data.decay,
        long_desc: data.long_desc,
        material: data.material,
        max_exist: data.max_exist,
        max_struct: data.max_struct,
        name: data.name,
        price: data.price,
        short_desc: data.short_desc,
        spec_proc: data.spec_proc,
        type: data.type,
        val0: data.val0,
        val1: data.val1,
        val2: data.val2,
        val3: data.val3,
        volume: data.volume,
        wear_flag: data.wear_flag,
        weight: data.weight,
      })
      .where(eq(obj.vnum, vnum));

    // Replace affects atomically
    await tx.delete(objaffect).where(eq(objaffect.vnum, vnum));
    for (const affect of data.affects) {
      await tx.insert(objaffect).values({
        mod1: affect.mod1,
        mod2: affect.mod2,
        owner,
        type: affect.type,
        vnum,
      });
    }

    // Replace extras atomically
    await tx.delete(objextra).where(eq(objextra.vnum, vnum));
    for (const extra of data.extras) {
      await tx.insert(objextra).values({
        description: extra.description,
        name: extra.name,
        owner,
        vnum,
      });
    }
  });
}

export async function deleteObject(vnum: number): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx.delete(objaffect).where(eq(objaffect.vnum, vnum));
    await tx.delete(objextra).where(eq(objextra.vnum, vnum));
    await tx.delete(obj).where(eq(obj.vnum, vnum));
  });
}

export async function objectExists(vnum: number): Promise<boolean> {
  const [row] = await immortalDb
    .select({ vnum: obj.vnum })
    .from(obj)
    .where(eq(obj.vnum, vnum))
    .limit(1);

  return row !== undefined;
}
