import { sql } from "drizzle-orm";

import { closePools, immortalDb, sneezyDb } from "./db.ts";

/**
 * Verify DB_NAME env vars point at `_test` databases. Throws immediately
 * if not - prevents accidental data loss when .env.test isn't loaded
 * (e.g. running `bun test` from the wrong directory).
 */
function assertTestDatabases(): void {
  const immortal = process.env["DB_NAME_IMMORTAL"];
  const sneezy = process.env["DB_NAME_SNEEZY"];

  if (!immortal?.endsWith("_test") || !sneezy?.endsWith("_test")) {
    throw new Error(
      "Refusing to run tests against real databases " +
        `(DB_NAME_IMMORTAL=${immortal ?? "immortal"}, DB_NAME_SNEEZY=${sneezy ?? "sneezy"}). ` +
        "Run bun test from services/buildertools/ so .env.test is loaded.",
    );
  }
}

/**
 * Test preload - runs once before any test file.
 * 1. Assert test databases (guard)
 * 2. Truncate all content tables (clean slate)
 * 3. Seed shared auth fixtures
 * 4. Register pool cleanup on exit
 */
assertTestDatabases();

// crypt("testpass", "testbuilder") truncated to 10 chars
const TEST_PASSWORD_HASH = "tek4edTZE8";
// crypt("testpass", "noblocks") truncated to 10 chars
const NO_BLOCKS_PASSWORD_HASH = "noA/WtpIgY";
// crypt("testpass", "otherbuilder") truncated to 10 chars
const OTHER_PASSWORD_HASH = "otICdK6ofe";

// Truncate all content tables in both databases
await immortalDb.execute(sql`DELETE FROM roomextra`);
await immortalDb.execute(sql`DELETE FROM roomexit`);
await immortalDb.execute(sql`DELETE FROM room`);
await immortalDb.execute(sql`DELETE FROM mob_extra`);
await immortalDb.execute(sql`DELETE FROM mob_imm`);
await immortalDb.execute(sql`DELETE FROM mobresponses`);
await immortalDb.execute(sql`DELETE FROM mob`);
await immortalDb.execute(sql`DELETE FROM objaffect`);
await immortalDb.execute(sql`DELETE FROM objextra`);
await immortalDb.execute(sql`DELETE FROM obj`);

await sneezyDb.execute(sql`DELETE FROM wizpower`);
await sneezyDb.execute(sql`DELETE FROM wizdata`);
await sneezyDb.execute(sql`DELETE FROM player`);
await sneezyDb.execute(sql`DELETE FROM account`);
await sneezyDb.execute(sql`DELETE FROM zone`);
await sneezyDb.execute(sql`DELETE FROM room`);
await sneezyDb.execute(sql`DELETE FROM obj`);

// Seed shared auth fixtures
await sneezyDb.execute(sql`
  INSERT INTO account (account_id, name, passwd)
  VALUES (99999, 'testbuilder', ${TEST_PASSWORD_HASH})
`);
await sneezyDb.execute(sql`
  INSERT INTO player (id, account_id, name)
  VALUES (99999, 99999, 'TestBuilder')
`);
await sneezyDb.execute(sql`
  INSERT INTO wizdata (player_id, setsev, blockastart, blockaend, blockbstart, blockbend)
  VALUES (99999, 0, 100, 199, 0, 0)
`);
await sneezyDb.execute(sql`
  INSERT INTO wizpower (player_id, wizpower) VALUES (99999, 1)
`);
await sneezyDb.execute(sql`
  INSERT INTO zone (zone_nr, zone_name, top, bottom, lifespan, reset_mode, zone_enabled, age, util_flag)
  VALUES (1, 'Test Zone', 999, 0, 30, 2, 1, 0, 0)
`);

// Seed no_blocks test user (account 99998 - valid credentials but no vnum blocks)
await sneezyDb.execute(sql`
  INSERT INTO account (account_id, name, passwd)
  VALUES (99998, 'noblocks', ${NO_BLOCKS_PASSWORD_HASH})
`);
await sneezyDb.execute(sql`
  INSERT INTO player (id, account_id, name)
  VALUES (99998, 99998, 'NoBlocks')
`);
await sneezyDb.execute(sql`
  INSERT INTO wizdata (player_id, setsev, blockastart, blockaend, blockbstart, blockbend)
  VALUES (99998, 0, 0, 0, 0, 0)
`);

// Seed second builder with overlapping vnum blocks for owner isolation tests
await sneezyDb.execute(sql`
  INSERT INTO account (account_id, name, passwd)
  VALUES (99997, 'otherbuilder', ${OTHER_PASSWORD_HASH})
`);
await sneezyDb.execute(sql`
  INSERT INTO player (id, account_id, name)
  VALUES (99997, 99997, 'OtherBuilder')
`);
await sneezyDb.execute(sql`
  INSERT INTO wizdata (player_id, setsev, blockastart, blockaend, blockbstart, blockbend)
  VALUES (99997, 0, 100, 199, 0, 0)
`);
await sneezyDb.execute(sql`
  INSERT INTO wizpower (player_id, wizpower) VALUES (99997, 1)
`);

// Clean up connection pools when all test files finish
process.on("beforeExit", () => {
  void closePools();
});
