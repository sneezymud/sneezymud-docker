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

  const { owner: _owner, ...objFields } = row;
  return {
    ...objFields,
    affects: affects.map(({ owner: _ao, ...fields }) => fields),
    extras: extras.map(({ owner: _eo, ...fields }) => fields),
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
  const { affects, extras, vnum: _vnum, ...objFields } = data;

  await immortalDb.transaction(async (tx) => {
    await tx.update(obj).set(objFields).where(eq(obj.vnum, vnum));

    // Replace affects atomically
    await tx.delete(objaffect).where(eq(objaffect.vnum, vnum));
    for (const affect of affects) {
      const { vnum: _av, ...fields } = affect;
      await tx.insert(objaffect).values({ ...fields, owner, vnum });
    }

    // Replace extras atomically
    await tx.delete(objextra).where(eq(objextra.vnum, vnum));
    for (const extra of extras) {
      const { vnum: _ev, ...fields } = extra;
      await tx.insert(objextra).values({ ...fields, owner, vnum });
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
