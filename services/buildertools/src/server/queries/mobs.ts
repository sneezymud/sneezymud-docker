import type { RowDataPacket } from "mysql2/promise";

import type { VnumBlock } from "@/shared/schemas/auth.ts";
import type { Mob, MobListItem } from "@/shared/schemas/mob.ts";

import { immortalPool } from "../db.ts";

interface MobRow extends RowDataPacket {
  ac: number;
  actions: number;
  adjacent_sound: null | string;
  affects: number;
  agi: number;
  attacks: number;
  bra: number;
  can_be_seen: number;
  cha: number;
  class: number;
  con: number;
  damage_level: number;
  damage_precision: number;
  def_position: number;
  description: string;
  dex: number;
  fact_perc: number;
  faction: number;
  foc: number;
  gold: number;
  height: number;
  hpbonus: number;
  intel: number;
  kar: number;
  letter: string;
  level: number;
  local_sound: null | string;
  long_desc: string;
  max_exist: number;
  name: string;
  per: number;
  pos: number;
  race: number;
  sex: number;
  short_desc: string;
  skin: number;
  spe: number;
  spec_proc: number;
  str: number;
  tohit: number;
  vision: number;
  vnum: number;
  weight: number;
  wis: number;
}

interface MobExtraRow extends RowDataPacket {
  description: string;
  keyword: string;
  vnum: number;
}

interface MobImmRow extends RowDataPacket {
  amt: number;
  type: number;
  vnum: number;
}

export async function listMobs(blocks: VnumBlock[]): Promise<MobListItem[]> {
  if (blocks.length === 0) {
    return [];
  }

  const conditions = blocks.map(() => "(vnum >= ? AND vnum <= ?)").join(" OR ");
  const params = blocks.flatMap((b) => [b.start, b.end]);

  const [rows] = await immortalPool.execute<MobRow[]>(
    `SELECT vnum, name, short_desc FROM mob WHERE ${conditions} ORDER BY vnum`,
    params,
  );

  return rows.map((r) => ({
    name: r.name,
    short_desc: r.short_desc,
    vnum: r.vnum,
  }));
}

export async function getMob(vnum: number): Promise<Mob | null> {
  const [mobs] = await immortalPool.execute<MobRow[]>(
    "SELECT * FROM mob WHERE vnum = ?",
    [vnum],
  );

  const row = mobs[0];
  if (!row) {
    return null;
  }

  const [[extras], [immunities]] = await Promise.all([
    immortalPool.execute<MobExtraRow[]>(
      "SELECT * FROM mob_extra WHERE vnum = ?",
      [vnum],
    ),
    immortalPool.execute<MobImmRow[]>("SELECT * FROM mob_imm WHERE vnum = ?", [
      vnum,
    ]),
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
  await immortalPool.execute(
    `INSERT INTO mob (vnum, owner, name, short_desc, long_desc, description,
       actions, affects, faction, fact_perc, letter, attacks, class, level, tohit,
       ac, hpbonus, damage_level, damage_precision, gold, race, weight, height,
       str, bra, con, dex, agi, intel, wis, foc, per, cha, kar, spe,
       pos, def_position, sex, spec_proc, skin, vision, can_be_seen, max_exist,
       local_sound, adjacent_sound)
     VALUES (?, ?, '', '', '', '', 0, 0, 0, 0, '', 1.0, 0, 1, 0,
       0, 0, 0, 0, 0, 0, 0, 0,
       0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
       8, 8, 0, 0, 0, 0, 0, 0,
       '', '')`,
    [vnum, owner],
  );
}

export async function updateMob(
  vnum: number,
  mob: Mob,
  owner: string,
): Promise<void> {
  const conn = await immortalPool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE mob SET name = ?, short_desc = ?, long_desc = ?, description = ?,
         actions = ?, affects = ?, faction = ?, fact_perc = ?, letter = ?,
         attacks = ?, class = ?, level = ?, tohit = ?, ac = ?, hpbonus = ?,
         damage_level = ?, damage_precision = ?, gold = ?, race = ?,
         weight = ?, height = ?,
         str = ?, bra = ?, con = ?, dex = ?, agi = ?, intel = ?, wis = ?,
         foc = ?, per = ?, cha = ?, kar = ?, spe = ?,
         pos = ?, def_position = ?, sex = ?, spec_proc = ?,
         skin = ?, vision = ?, can_be_seen = ?, max_exist = ?,
         local_sound = ?, adjacent_sound = ?
       WHERE vnum = ?`,
      [
        mob.name,
        mob.short_desc,
        mob.long_desc,
        mob.description,
        mob.actions,
        mob.affects,
        mob.faction,
        mob.fact_perc,
        mob.letter,
        mob.attacks,
        mob.class,
        mob.level,
        mob.tohit,
        mob.ac,
        mob.hpbonus,
        mob.damage_level,
        mob.damage_precision,
        mob.gold,
        mob.race,
        mob.weight,
        mob.height,
        mob.str,
        mob.bra,
        mob.con,
        mob.dex,
        mob.agi,
        mob.intel,
        mob.wis,
        mob.foc,
        mob.per,
        mob.cha,
        mob.kar,
        mob.spe,
        mob.pos,
        mob.def_position,
        mob.sex,
        mob.spec_proc,
        mob.skin,
        mob.vision,
        mob.can_be_seen,
        mob.max_exist,
        mob.local_sound,
        mob.adjacent_sound,
        vnum,
      ],
    );

    // Replace extras atomically
    await conn.execute("DELETE FROM mob_extra WHERE vnum = ?", [vnum]);
    for (const extra of mob.extras) {
      await conn.execute(
        `INSERT INTO mob_extra (vnum, owner, keyword, description)
         VALUES (?, ?, ?, ?)`,
        [vnum, owner, extra.keyword, extra.description],
      );
    }

    // Replace immunities atomically
    await conn.execute("DELETE FROM mob_imm WHERE vnum = ?", [vnum]);
    for (const imm of mob.immunities) {
      await conn.execute(
        `INSERT INTO mob_imm (vnum, owner, type, amt)
         VALUES (?, ?, ?, ?)`,
        [vnum, owner, imm.type, imm.amt],
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

export async function deleteMob(vnum: number): Promise<void> {
  const conn = await immortalPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute("DELETE FROM mob_extra WHERE vnum = ?", [vnum]);
    await conn.execute("DELETE FROM mob_imm WHERE vnum = ?", [vnum]);
    await conn.execute("DELETE FROM mobresponses WHERE vnum = ?", [vnum]);
    await conn.execute("DELETE FROM mob WHERE vnum = ?", [vnum]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function mobExists(vnum: number): Promise<boolean> {
  const [rows] = await immortalPool.execute<RowDataPacket[]>(
    "SELECT 1 FROM mob WHERE vnum = ? LIMIT 1",
    [vnum],
  );
  return rows.length > 0;
}
