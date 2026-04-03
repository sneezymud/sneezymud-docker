import {
  bigint,
  decimal,
  double,
  int,
  mysqlTable,
  primaryKey,
  text,
} from "drizzle-orm/mysql-core";

export const mob = mysqlTable(
  "mob",
  {
    ac: decimal({ mode: "number", precision: 5, scale: 1 }).notNull(),
    actions: int({ unsigned: true }).notNull(),
    adjacent_sound: text(),
    affects: int({ unsigned: true }).notNull(),
    agi: int().notNull(),
    attacks: decimal({ mode: "number", precision: 5, scale: 1 }).notNull(),
    bra: int().notNull(),
    can_be_seen: int().notNull(),
    cha: int().notNull(),
    class: int().notNull(),
    con: int().notNull(),
    damage_level: decimal({ mode: "number", precision: 5, scale: 1 }).notNull(),
    damage_precision: int().notNull(),
    def_position: int().notNull(),
    description: text().notNull(),
    dex: int().notNull(),
    fact_perc: int().notNull(),
    faction: int().notNull(),
    foc: int().notNull(),
    gold: int().notNull(),
    height: int().notNull(),
    hpbonus: decimal({ mode: "number", precision: 5, scale: 1 }).notNull(),
    intel: int().notNull(),
    kar: int().notNull(),
    letter: text().notNull(),
    level: int().notNull(),
    local_sound: text(),
    long_desc: text().notNull(),
    max_exist: int().notNull(),
    name: text().notNull(),
    per: int().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    pos: int().notNull(),
    race: int().notNull(),
    sex: int().notNull(),
    short_desc: text().notNull(),
    skin: int().notNull(),
    spe: int().notNull(),
    spec_proc: int().notNull(),
    str: int().notNull(),
    tohit: int().notNull(),
    vision: int().notNull(),
    vnum: int().notNull(),
    weight: int().notNull(),
    wis: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.player_id, table.vnum] })],
);

export const mobExtra = mysqlTable(
  "mob_extra",
  {
    description: text(),
    keyword: text().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    vnum: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.player_id, table.vnum, table.keyword] }),
  ],
);

export const mobImm = mysqlTable(
  "mob_imm",
  {
    amt: int(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    type: int().notNull(),
    vnum: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.player_id, table.vnum, table.type] }),
  ],
);

export const mobresponses = mysqlTable(
  "mobresponses",
  {
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    response: text().notNull(),
    vnum: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.player_id, table.vnum] })],
);

export const obj = mysqlTable(
  "obj",
  {
    action_desc: text().notNull(),
    action_flag: int().notNull(),
    can_be_seen: int().notNull(),
    cur_struct: int().notNull(),
    decay: int().notNull(),
    long_desc: text().notNull(),
    material: int().notNull(),
    max_exist: int().notNull(),
    max_struct: int().notNull(),
    name: text().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    price: int().notNull(),
    short_desc: text().notNull(),
    spec_proc: int().notNull(),
    type: int().notNull(),
    val0: int().notNull(),
    val1: int().notNull(),
    val2: int().notNull(),
    val3: int().notNull(),
    vnum: int().notNull(),
    volume: int().notNull(),
    wear_flag: int().notNull(),
    weight: double().notNull(),
  },
  (table) => [primaryKey({ columns: [table.player_id, table.vnum] })],
);

export const objaffect = mysqlTable(
  "objaffect",
  {
    mod1: int().notNull(),
    mod2: int().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    type: int().notNull(),
    vnum: int().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.player_id,
        table.vnum,
        table.type,
        table.mod1,
        table.mod2,
      ],
    }),
  ],
);

export const objextra = mysqlTable(
  "objextra",
  {
    description: text().notNull(),
    name: text().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    vnum: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.player_id, table.vnum, table.name] }),
  ],
);

export const room = mysqlTable(
  "room",
  {
    block: int(),
    capacity: int().notNull(),
    description: text().notNull(),
    height: int().notNull(),
    name: text().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    river_dir: int().notNull(),
    river_speed: int().notNull(),
    room_flag: int().notNull(),
    sector: int().notNull(),
    spec: int().notNull(),
    telelook: int().notNull(),
    teletarg: int().notNull(),
    teletime: int().notNull(),
    vnum: int().notNull(),
    x: int().notNull(),
    y: int().notNull(),
    z: int().notNull(),
    zone: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.player_id, table.vnum] })],
);

export const roomextra = mysqlTable(
  "roomextra",
  {
    block: int(),
    description: text().notNull(),
    name: text().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    vnum: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.player_id, table.vnum, table.name] }),
  ],
);

export const roomexit = mysqlTable(
  "roomexit",
  {
    block: int(),
    condition_flag: int().notNull(),
    description: text().notNull(),
    destination: int().notNull(),
    direction: int().notNull(),
    key_num: int().notNull(),
    lock_difficulty: int().notNull(),
    name: text().notNull(),
    player_id: bigint({ mode: "number", unsigned: true }).notNull(),
    type: int().notNull(),
    vnum: int().notNull(),
    weight: int().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.player_id, table.vnum, table.direction],
    }),
  ],
);
