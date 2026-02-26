import { and, eq, gte, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Mob, MobListItem } from "@/shared/schemas/mob.ts";

import { mobExtraSchema } from "@/shared/schemas/mob.ts";

import { immortalDb } from "../db.ts";
import { mob, mobExtra, mobImm, mobresponses } from "../schema/immortal.ts";

export async function listMobs(blocks: VnumBlock[]): Promise<MobListItem[]> {
  if (blocks.length === 0) {
    return [];
  }

  return immortalDb
    .select({ name: mob.name, short_desc: mob.short_desc, vnum: mob.vnum })
    .from(mob)
    .where(
      or(
        ...blocks.map((b) => and(gte(mob.vnum, b.start), lte(mob.vnum, b.end))),
      ),
    )
    .orderBy(mob.vnum);
}

export async function getMob(vnum: number): Promise<Mob | null> {
  const [row] = await immortalDb.select().from(mob).where(eq(mob.vnum, vnum));

  if (!row) {
    return null;
  }

  const [extras, immunities] = await Promise.all([
    immortalDb.select().from(mobExtra).where(eq(mobExtra.vnum, vnum)),
    immortalDb.select().from(mobImm).where(eq(mobImm.vnum, vnum)),
  ]);

  const { letter: _letter, owner: _owner, pos: _pos, ...mobFields } = row;
  return {
    ...mobFields,
    adjacent_sound: mobFields.adjacent_sound ?? "",
    extras: extras.map(({ owner: _eo, ...fields }) =>
      mobExtraSchema.parse(fields),
    ),
    immunities: immunities.map(({ owner: _io, ...fields }) => fields),
    local_sound: mobFields.local_sound ?? "",
  };
}

export async function createMob(vnum: number, owner: string): Promise<void> {
  await immortalDb.insert(mob).values({
    ac: 0,
    actions: 0,
    adjacent_sound: "",
    affects: 0,
    agi: 0,
    attacks: 1,
    bra: 0,
    can_be_seen: 0,
    cha: 0,
    class: 0,
    con: 0,
    damage_level: 0,
    damage_precision: 0,
    def_position: 9,
    description: "",
    dex: 0,
    fact_perc: 0,
    faction: 0,
    foc: 0,
    gold: 0,
    height: 0,
    hpbonus: 0,
    intel: 0,
    kar: 0,
    letter: "L",
    level: 1,
    local_sound: "",
    long_desc: "",
    max_exist: 0,
    name: "",
    owner,
    per: 0,
    pos: 9,
    race: 0,
    sex: 0,
    short_desc: "",
    skin: 0,
    spe: 0,
    spec_proc: 0,
    str: 0,
    tohit: 0,
    vision: 0,
    vnum,
    weight: 0,
    wis: 0,
  });
}

export async function updateMob(
  vnum: number,
  data: Mob,
  owner: string,
): Promise<void> {
  const { extras, immunities, vnum: _vnum, ...mobFields } = data;
  const letter = mobFields.local_sound && !mobFields.adjacent_sound ? "A" : "L";

  await immortalDb.transaction(async (tx) => {
    await tx
      .update(mob)
      .set({ ...mobFields, letter, owner, pos: mobFields.def_position })
      .where(eq(mob.vnum, vnum));

    // Replace extras atomically
    await tx.delete(mobExtra).where(eq(mobExtra.vnum, vnum));
    for (const extra of extras) {
      const { vnum: _ev, ...fields } = extra;
      await tx.insert(mobExtra).values({ ...fields, owner, vnum });
    }

    // Replace immunities atomically
    await tx.delete(mobImm).where(eq(mobImm.vnum, vnum));
    for (const imm of immunities) {
      const { vnum: _iv, ...fields } = imm;
      await tx.insert(mobImm).values({ ...fields, owner, vnum });
    }
  });
}

export async function deleteMob(vnum: number): Promise<void> {
  await immortalDb.transaction(async (tx) => {
    await tx.delete(mobExtra).where(eq(mobExtra.vnum, vnum));
    await tx.delete(mobImm).where(eq(mobImm.vnum, vnum));
    await tx.delete(mobresponses).where(eq(mobresponses.vnum, vnum));
    await tx.delete(mob).where(eq(mob.vnum, vnum));
  });
}

export async function mobExists(vnum: number): Promise<boolean> {
  const [row] = await immortalDb
    .select({ vnum: mob.vnum })
    .from(mob)
    .where(eq(mob.vnum, vnum))
    .limit(1);

  return row !== undefined;
}
