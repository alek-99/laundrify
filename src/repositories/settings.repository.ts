
import { getDatabase } from "../database";

// ==========================================
// SETTING KEYS
// ==========================================

export const SETTING_KEYS = {
  LAUNDRY_ADDRESS: "laundry_address",
} as const;

// ==========================================
// SETTING REPOSITORY
// ==========================================

export async function setSetting(key: string, value: string) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = CURRENT_TIMESTAMP`,
    key,
    value,
  );

  return true;
}

export async function getSetting(key: string) {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = ?`,
    key,
  );

  return result?.value ?? null;
}

export async function getAllSettings() {
  const db = await getDatabase();

  return db.getAllAsync<{
    key: string;
    value: string | null;
  }>(`SELECT key, value FROM app_settings ORDER BY key ASC`);
}

export async function deleteSetting(key: string) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `DELETE FROM app_settings WHERE key = ?`,
    key,
  );

  return result.changes > 0;
}

// ==========================================
// LAUNDRY ADDRESS
// ==========================================

export async function setLaundryAddress(address: string) {
  return setSetting(SETTING_KEYS.LAUNDRY_ADDRESS, address.trim());
}

export async function getLaundryAddress() {
  return (await getSetting(SETTING_KEYS.LAUNDRY_ADDRESS)) ?? "";
}
