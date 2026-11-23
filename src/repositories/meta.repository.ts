import { getDatabase } from "../database";

export async function getMeta(key: string) {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = ?`,
    key,
  );

  return result?.value ?? null;
}

export async function setMeta(key: string, value: string) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO app_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value`,
    key,
    value,
  );

  return true;
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
    name: "laundrify.db",
    version,
    tables: tables.map((table) => table.name),
  };
}
