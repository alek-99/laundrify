import { DATABASE_NAME, getDatabase } from "../database";

export async function getMeta(key: string) {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = ?`,
    key,
  );

  return result?.value ?? null;
}

export async function getDatabaseInfo() {
  const db = await getDatabase();

  const version = await getMeta("database_version");

  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table'
       AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  );

  return {
    name: DATABASE_NAME,
    version,
    tables: tables.map((table) => table.name),
  };
}
