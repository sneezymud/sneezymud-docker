import { and, eq, gte, like, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Obj, ObjListItem } from "@/shared/schemas/obj.ts";

import { immortalDb, sneezyDb } from "../db.ts";
import { obj, objaffect, objextra } from "../schema/immortal.ts";
import { obj as sneezyObj } from "../schema/sneezy.ts";

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
    await tx
      .update(obj)
      .set({ ...objFields, owner })
      .where(eq(obj.vnum, vnum));

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

export async function searchObjects(
  query: string,
): Promise<Array<{ short_desc: string; vnum: number }>> {
  const likeParam = `%${query}%`;
  const isNumeric = /^\d+$/.test(query);

  const nameFilter = like(obj.short_desc, likeParam);
  const sneezyNameFilter = like(sneezyObj.short_desc, likeParam);

  const [immortalRows, sneezyRows] = await Promise.all([
    immortalDb
      .select({ short_desc: obj.short_desc, vnum: obj.vnum })
      .from(obj)
      .where(
        isNumeric ? or(eq(obj.vnum, Number(query)), nameFilter) : nameFilter,
      )
      .orderBy(obj.vnum)
      .limit(10),
    sneezyDb
      .select({ short_desc: sneezyObj.short_desc, vnum: sneezyObj.vnum })
      .from(sneezyObj)
      .where(
        isNumeric
          ? or(eq(sneezyObj.vnum, Number(query)), sneezyNameFilter)
          : sneezyNameFilter,
      )
      .orderBy(sneezyObj.vnum)
      .limit(10),
  ]);

  const seen = new Set<number>();
  const merged: Array<{ short_desc: string; vnum: number }> = [];

  for (const row of [...immortalRows, ...sneezyRows]) {
    if (!seen.has(row.vnum)) {
      seen.add(row.vnum);
      merged.push({ short_desc: row.short_desc, vnum: row.vnum });
    }
  }

  merged.sort((a, b) => a.vnum - b.vnum);
  return merged.slice(0, 20);
}

export async function getObjectShortDesc(vnum: number): Promise<null | string> {
  // Try immortal first (builder workspace), then sneezy (production)
  // Key vnums can reference objects outside the builder's assigned blocks
  const [immortalRow] = await immortalDb
    .select({ short_desc: obj.short_desc })
    .from(obj)
    .where(eq(obj.vnum, vnum))
    .limit(1);

  if (immortalRow) {
    return immortalRow.short_desc;
  }

  const [sneezyRow] = await sneezyDb
    .select({ short_desc: sneezyObj.short_desc })
    .from(sneezyObj)
    .where(eq(sneezyObj.vnum, vnum))
    .limit(1);

  if (sneezyRow) {
    return sneezyRow.short_desc;
  }

  return null;
}

export async function objectExists(vnum: number): Promise<boolean> {
  const [row] = await immortalDb
    .select({ vnum: obj.vnum })
    .from(obj)
    .where(eq(obj.vnum, vnum))
    .limit(1);

  return row !== undefined;
}
