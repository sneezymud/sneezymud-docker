import { double, int, mysqlTable, text } from "drizzle-orm/mysql-core";

export const mob = mysqlTable("mob", {
  ac: double().notNull(),
  actions: int({ unsigned: true }).notNull(),
  adjacent_sound: text(),
  affects: int({ unsigned: true }).notNull(),
  agi: int().notNull(),
  attacks: double().notNull(),
  bra: int().notNull(),
  can_be_seen: int().notNull(),
  cha: int().notNull(),
  class: int().notNull(),
  con: int().notNull(),
  damage_level: double().notNull(),
  damage_precision: int().notNull(),
  def_position: int().notNull(),
  description: text().notNull(),
  dex: int().notNull(),
  fact_perc: int().notNull(),
  faction: int().notNull(),
  foc: int().notNull(),
  gold: int().notNull(),
  height: int().notNull(),
  hpbonus: double().notNull(),
  intel: int().notNull(),
  kar: int().notNull(),
  letter: text().notNull(),
  level: int().notNull(),
  local_sound: text(),
  long_desc: text().notNull(),
  max_exist: int().notNull(),
  name: text().notNull(),
  owner: text().notNull(),
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

export const mobExtra = mysqlTable("mob_extra", {
  description: text().notNull(),
  keyword: text().notNull(),
  owner: text().notNull(),
  vnum: int().notNull(),
});

export const mobImm = mysqlTable("mob_imm", {
  amt: int().notNull(),
  owner: text().notNull(),
  type: int().notNull(),
  vnum: int().notNull(),
});

export const mobresponses = mysqlTable("mobresponses", {
  owner: text().notNull(),
  response: text().notNull(),
  vnum: int().primaryKey(),
});

export const obj = mysqlTable("obj", {
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
  owner: text().notNull(),
  price: int().notNull(),
  short_desc: text().notNull(),
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

export const objaffect = mysqlTable("objaffect", {
  mod1: int().notNull(),
  mod2: int().notNull(),
  owner: text().notNull(),
  type: int().notNull(),
  vnum: int().notNull(),
});

export const objextra = mysqlTable("objextra", {
  description: text().notNull(),
  name: text().notNull(),
  owner: text().notNull(),
  vnum: int().notNull(),
});

export const room = mysqlTable("room", {
  capacity: int().notNull(),
  description: text().notNull(),
  height: int().notNull(),
  name: text().notNull(),
  owner: text().notNull(),
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

export const roomextra = mysqlTable("roomextra", {
  block: int(),
  description: text().notNull(),
  name: text().notNull(),
  owner: text(),
  vnum: int().notNull(),
});

export const roomexit = mysqlTable("roomexit", {
  block: int().notNull(),
  condition_flag: int().notNull(),
  description: text().notNull(),
  destination: int().notNull(),
  direction: int().notNull(),
  key_num: int().notNull(),
  lock_difficulty: int().notNull(),
  name: text().notNull(),
  owner: text().notNull(),
  type: int().notNull(),
  vnum: int().notNull(),
  weight: int().notNull(),
});
