import mysql from "mysql2/promise";

function noop() {
  // intentionally empty
}

const configuredHost = process.env["DB_HOST"] ?? "sneezy-db";

async function resolveHost(): Promise<string> {
  const testPool = mysql.createPool({
    connectionLimit: 1,
    connectTimeout: 2000,
    database: "immortal",
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
export const immortalPool = mysql.createPool({
  ...poolConfig,
  database: "immortal",
});

// Production game database — accounts, players, wizdata, zones (read-only from this app)
export const sneezyPool = mysql.createPool({
  ...poolConfig,
  database: "sneezy",
});
