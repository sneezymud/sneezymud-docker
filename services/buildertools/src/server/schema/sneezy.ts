import { int, mysqlTable, text } from "drizzle-orm/mysql-core";

export const account = mysqlTable("account", {
  account_id: int().primaryKey(),
  name: text().notNull(),
  passwd: text().notNull(),
});

export const player = mysqlTable("player", {
  account_id: int().notNull(),
  id: int().primaryKey(),
  name: text().notNull(),
});

export const room = mysqlTable("room", {
  name: text().notNull(),
  vnum: int().primaryKey(),
});

export const wizdata = mysqlTable("wizdata", {
  blockaend: int().notNull(),
  blockastart: int().notNull(),
  blockbend: int().notNull(),
  blockbstart: int().notNull(),
  player_id: int().notNull(),
});

export const obj = mysqlTable("obj", {
  short_desc: text().notNull(),
  vnum: int().primaryKey(),
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
