import { and, eq, gte, lte, or } from "drizzle-orm";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Mob, MobListItem } from "@/shared/schemas/mob.ts";

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

  return {
    ac: row.ac,
    actions: row.actions,
    adjacent_sound: row.adjacent_sound ?? "",
    affects: row.affects,
    agi: row.agi,
    attacks: row.attacks,
    bra: row.bra,
    can_be_seen: row.can_be_seen,
    cha: row.cha,
    class: row.class,
    con: row.con,
    damage_level: row.damage_level,
    damage_precision: row.damage_precision,
    def_position: row.def_position,
    description: row.description,
    dex: row.dex,
    extras: extras.map((e) => ({
      description: e.description,
      keyword: e.keyword,
      vnum: e.vnum,
    })),
    fact_perc: row.fact_perc,
    faction: row.faction,
    foc: row.foc,
    gold: row.gold,
    height: row.height,
    hpbonus: row.hpbonus,
    immunities: immunities.map((i) => ({
      amt: i.amt,
      type: i.type,
      vnum: i.vnum,
    })),
    intel: row.intel,
    kar: row.kar,
    letter: row.letter,
    level: row.level,
    local_sound: row.local_sound ?? "",
    long_desc: row.long_desc,
    max_exist: row.max_exist,
    name: row.name,
    per: row.per,
    pos: row.pos,
    race: row.race,
    sex: row.sex,
    short_desc: row.short_desc,
    skin: row.skin,
    spe: row.spe,
    spec_proc: row.spec_proc,
    str: row.str,
    tohit: row.tohit,
    vision: row.vision,
    vnum: row.vnum,
    weight: row.weight,
    wis: row.wis,
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
    def_position: 8,
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
    letter: "",
    level: 1,
    local_sound: "",
    long_desc: "",
    max_exist: 0,
    name: "",
    owner,
    per: 0,
    pos: 8,
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
  await immortalDb.transaction(async (tx) => {
    await tx
      .update(mob)
      .set({
        ac: data.ac,
        actions: data.actions,
        adjacent_sound: data.adjacent_sound,
        affects: data.affects,
        agi: data.agi,
        attacks: data.attacks,
        bra: data.bra,
        can_be_seen: data.can_be_seen,
        cha: data.cha,
        class: data.class,
        con: data.con,
        damage_level: data.damage_level,
        damage_precision: data.damage_precision,
        def_position: data.def_position,
        description: data.description,
        dex: data.dex,
        fact_perc: data.fact_perc,
        faction: data.faction,
        foc: data.foc,
        gold: data.gold,
        height: data.height,
        hpbonus: data.hpbonus,
        intel: data.intel,
        kar: data.kar,
        letter: data.letter,
        level: data.level,
        local_sound: data.local_sound,
        long_desc: data.long_desc,
        max_exist: data.max_exist,
        name: data.name,
        per: data.per,
        pos: data.pos,
        race: data.race,
        sex: data.sex,
        short_desc: data.short_desc,
        skin: data.skin,
        spe: data.spe,
        spec_proc: data.spec_proc,
        str: data.str,
        tohit: data.tohit,
        vision: data.vision,
        weight: data.weight,
        wis: data.wis,
      })
      .where(eq(mob.vnum, vnum));

    // Replace extras atomically
    await tx.delete(mobExtra).where(eq(mobExtra.vnum, vnum));
    for (const extra of data.extras) {
      await tx.insert(mobExtra).values({
        description: extra.description,
        keyword: extra.keyword,
        owner,
        vnum,
      });
    }

    // Replace immunities atomically
    await tx.delete(mobImm).where(eq(mobImm.vnum, vnum));
    for (const imm of data.immunities) {
      await tx.insert(mobImm).values({
        amt: imm.amt,
        owner,
        type: imm.type,
        vnum,
      });
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
