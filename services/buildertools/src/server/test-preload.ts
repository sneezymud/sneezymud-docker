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
// crypt("testpass", "expandedbuilder") truncated to 10 chars
const EXPANDED_PASSWORD_HASH = "exYn.2flu9";
// crypt("testpass", "lowonlybuilder") truncated to 10 chars
const LOW_ONLY_PASSWORD_HASH = "loY9DFizWb";
// crypt("testpass", "nonbuilder") truncated to 10 chars
// NOTE: DES crypt uses only the first 2 chars of the salt, so "nonbuilder" and
// "noblocks" both resolve to salt "no" - the hashes are identical. This is fine:
// login queries by username, so the two accounts remain distinct.
const NONBUILDER_PASSWORD_HASH = "noA/WtpIgY";

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
await sneezyDb.execute(sql`DELETE FROM roomexit`);
await sneezyDb.execute(sql`DELETE FROM roomextra`);
await sneezyDb.execute(sql`DELETE FROM room`);
await sneezyDb.execute(sql`DELETE FROM mob_extra`);
await sneezyDb.execute(sql`DELETE FROM mob_imm`);
await sneezyDb.execute(sql`DELETE FROM mobresponses`);
await sneezyDb.execute(sql`DELETE FROM mob`);
await sneezyDb.execute(sql`DELETE FROM objaffect`);
await sneezyDb.execute(sql`DELETE FROM objextra`);
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
// testbuilder: all builder powers (fully privileged)
for (const power of [1, 2, 3, 5, 7, 9, 10, 11, 12, 13, 14, 20, 29]) {
  await sneezyDb.execute(
    sql`INSERT INTO wizpower (player_id, wizpower) VALUES (99999, ${power})`,
  );
}
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
// noblocks: POWER_BUILDER only (can log in, no entity access)
await sneezyDb.execute(
  sql`INSERT INTO wizpower (player_id, wizpower) VALUES (99998, 29)`,
);

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
// otherbuilder: BUILDER + room powers + MEDIT + OEDIT
for (const power of [1, 3, 5, 7, 10, 29]) {
  await sneezyDb.execute(
    sql`INSERT INTO wizpower (player_id, wizpower) VALUES (99997, ${power})`,
  );
}

// Seed expanded-access builder: own blocks 200-299, POWER_LOW + NO_LIMITS
await sneezyDb.execute(sql`
  INSERT INTO account (account_id, name, passwd)
  VALUES (99996, 'expandedbuilder', ${EXPANDED_PASSWORD_HASH})
`);
await sneezyDb.execute(sql`
  INSERT INTO player (id, account_id, name)
  VALUES (99996, 99996, 'ExpandedBuilder')
`);
await sneezyDb.execute(sql`
  INSERT INTO wizdata (player_id, setsev, blockastart, blockaend, blockbstart, blockbend)
  VALUES (99996, 0, 200, 299, 0, 0)
`);
// expandedbuilder: BUILDER + entity powers + LOW + NO_LIMITS
for (const power of [1, 3, 5, 7, 10, 29, 63, 110]) {
  await sneezyDb.execute(
    sql`INSERT INTO wizpower (player_id, wizpower) VALUES (99996, ${power})`,
  );
}

// Seed LOW-only builder: own blocks 300-399, POWER_LOW but NOT POWER_NO_LIMITS
await sneezyDb.execute(sql`
  INSERT INTO account (account_id, name, passwd)
  VALUES (99995, 'lowonlybuilder', ${LOW_ONLY_PASSWORD_HASH})
`);
await sneezyDb.execute(sql`
  INSERT INTO player (id, account_id, name)
  VALUES (99995, 99995, 'LowOnlyBuilder')
`);
await sneezyDb.execute(sql`
  INSERT INTO wizdata (player_id, setsev, blockastart, blockaend, blockbstart, blockbend)
  VALUES (99995, 0, 300, 399, 500, 599)
`);
// lowonlybuilder: BUILDER + entity powers + LOW (no NO_LIMITS)
for (const power of [1, 3, 5, 7, 10, 29, 63]) {
  await sneezyDb.execute(
    sql`INSERT INTO wizpower (player_id, wizpower) VALUES (99995, ${power})`,
  );
}

// Seed nonbuilder test user (account 99994 - valid credentials, wizdata row, but NO POWER_BUILDER)
await sneezyDb.execute(sql`
  INSERT INTO account (account_id, name, passwd)
  VALUES (99994, 'nonbuilder', ${NONBUILDER_PASSWORD_HASH})
`);
await sneezyDb.execute(sql`
  INSERT INTO player (id, account_id, name)
  VALUES (99994, 99994, 'NonBuilder')
`);
await sneezyDb.execute(sql`
  INSERT INTO wizdata (player_id, setsev, blockastart, blockaend, blockbstart, blockbend)
  VALUES (99994, 0, 0, 0, 0, 0)
`);
// nonbuilder: NO powers at all (specifically no POWER_BUILDER=29)
// The wizdata row is critical - authenticateBuilder does INNER JOIN wizdata,
// so without it the query returns no rows and hits not_found instead of not_immortal.

// Clean up connection pools when all test files finish
process.on("beforeExit", () => {
  void closePools();
});
