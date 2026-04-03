import {
  decimal,
  double,
  int,
  longtext,
  mediumtext,
  mysqlTable,
  primaryKey,
  text,
  varchar,
} from "drizzle-orm/mysql-core";

export const account = mysqlTable("account", {
  account_id: int().primaryKey(),
  name: text(),
  passwd: text(),
});

export const player = mysqlTable("player", {
  account_id: int(),
  id: int().primaryKey(),
  name: text(),
});

export const wizdata = mysqlTable("wizdata", {
  blockaend: int(),
  blockastart: int(),
  blockbend: int(),
  blockbstart: int(),
  player_id: int().notNull(),
});

export const wizpower = mysqlTable("wizpower", {
  player_id: int(),
  wizpower: int(),
});

export const zone = mysqlTable("zone", {
  age: int(),
  bottom: int(),
  lifespan: int(),
  reset_mode: int(),
  top: int(),
  util_flag: int(),
  zone_enabled: int(),
  zone_name: text().notNull(),
  zone_nr: int().primaryKey(),
});

export const room = mysqlTable("room", {
  capacity: int().notNull(),
  description: mediumtext().notNull(),
  height: int().notNull(),
  name: varchar({ length: 127 }).notNull(),
  river_dir: int().notNull(),
  river_speed: int().notNull(),
  room_flag: int().notNull(),
  sector: int().notNull(),
  spec: int().notNull(),
  telelook: int().notNull(),
  teletarg: int().notNull(),
  teletime: int().notNull(),
  vnum: int().primaryKey(),
  x: int().notNull(),
  y: int().notNull(),
  z: int().notNull(),
  zone: int().notNull(),
});

export const roomexit = mysqlTable(
  "roomexit",
  {
    condition_flag: int().notNull(),
    description: mediumtext().notNull(),
    destination: int().notNull(),
    direction: int().notNull(),
    key_num: int().notNull(),
    lock_difficulty: int().notNull(),
    name: varchar({ length: 127 }).notNull(),
    type: int().notNull(),
    vnum: int().notNull(),
    weight: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.vnum, table.direction] })],
);

export const roomextra = mysqlTable(
  "roomextra",
  {
    description: mediumtext().notNull(),
    name: varchar({ length: 255 }).notNull(),
    vnum: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.vnum, table.name] })],
);

export const mob = mysqlTable("mob", {
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
  vnum: int().primaryKey(),
  weight: int().notNull(),
  wis: int().notNull(),
});

export const mobExtra = mysqlTable(
  "mob_extra",
  {
    description: text(),
    keyword: varchar({ length: 32 }).notNull(),
    vnum: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.vnum, table.keyword] })],
);

export const mobImm = mysqlTable(
  "mob_imm",
  {
    amt: int(),
    type: int().notNull(),
    vnum: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.vnum, table.type] })],
);

export const mobresponses = mysqlTable("mobresponses", {
  response: longtext().notNull(),
  vnum: int().primaryKey(),
});

export const obj = mysqlTable("obj", {
  action_desc: varchar({ length: 255 }).notNull(),
  action_flag: int().notNull(),
  can_be_seen: int().notNull(),
  cur_struct: int().notNull(),
  decay: int().notNull(),
  long_desc: varchar({ length: 255 }).notNull(),
  material: int().notNull(),
  max_exist: int().notNull(),
  max_struct: int().notNull(),
  name: varchar({ length: 127 }).notNull(),
  price: int().notNull(),
  short_desc: varchar({ length: 127 }).notNull(),
  spec_proc: int().notNull(),
  type: int().notNull(),
  val0: int().notNull(),
  val1: int().notNull(),
  val2: int().notNull(),
  val3: int().notNull(),
  vnum: int().primaryKey(),
  volume: int().notNull(),
  wear_flag: int().notNull(),
  weight: double().notNull(),
});

export const objextra = mysqlTable(
  "objextra",
  {
    description: mediumtext().notNull(),
    name: varchar({ length: 127 }).notNull(),
    vnum: int().notNull(),
  },
  (table) => [primaryKey({ columns: [table.vnum, table.name] })],
);

export const objaffect = mysqlTable(
  "objaffect",
  {
    mod1: int().notNull(),
    mod2: int().notNull(),
    type: int().notNull(),
    vnum: int().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.vnum, table.type, table.mod1, table.mod2] }),
  ],
);
