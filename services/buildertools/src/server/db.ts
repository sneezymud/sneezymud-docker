import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

function noop() {
  // intentionally empty
}

const configuredHost = process.env["DB_HOST"] ?? "sneezy-db";

async function resolveHost(): Promise<string> {
  const testPool = mysql.createPool({
    connectionLimit: 1,
    connectTimeout: 2000,
    database: process.env["DB_NAME_IMMORTAL"] ?? "immortal",
    host: configuredHost,
    password: process.env["DB_PASS"] ?? "password",
    user: process.env["DB_USER"] ?? "sneezy",
  });

  try {
    const conn = await testPool.getConnection();
    conn.release();
    await testPool.end();
    console.log(`DB: connected to ${configuredHost}`);
    return configuredHost;
  } catch {
    // Best-effort cleanup; ignore failures since we're switching hosts anyway
    await testPool.end().catch(noop);
    if (configuredHost !== "localhost") {
      console.log(
        `DB: ${configuredHost} unreachable, falling back to localhost`,
      );
      return "localhost";
    }
    throw new Error("DB: cannot connect to database");
  }
}

const host = await resolveHost();

const poolConfig: mysql.PoolOptions = {
  connectionLimit: 10,
  host,
  password: process.env["DB_PASS"] ?? "password",
  user: process.env["DB_USER"] ?? "sneezy",
  waitForConnections: true,
};

// Builder workspace — rooms, mobs, objects, mob responses
const immortalPool = mysql.createPool({
  ...poolConfig,
  database: process.env["DB_NAME_IMMORTAL"] ?? "immortal",
});

// Production game database — accounts, players, wizdata, zones (read-only from this app)
const sneezyPool = mysql.createPool({
  ...poolConfig,
  database: process.env["DB_NAME_SNEEZY"] ?? "sneezy",
});

export const immortalDb = drizzle(immortalPool);
export const sneezyDb = drizzle(sneezyPool);

export async function closePools(): Promise<void> {
  await Promise.all([immortalPool.end(), sneezyPool.end()]);
}

/** MySQL error 1062: duplicate entry for a unique/primary key. */
export function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "errno" in err &&
    (err as { errno: unknown }).errno === 1062
  );
}
