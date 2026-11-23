import * as SQLite from "expo-sqlite";

export const DATABASE_NAME = "laundrifyV2.db";

let database: SQLite.SQLiteDatabase | null = null;

type ExclusiveTransaction = Parameters<
  Parameters<SQLite.SQLiteDatabase["withExclusiveTransactionAsync"]>[0]
>[0];

/**
 * withExclusiveTransactionAsync bertipe Promise<void> (nilai return dari
 * callback TIDAK diteruskan). Helper ini menangkap hasilnya agar fungsi
 * service yang "return { ... }" benar-benar mengembalikan nilainya.
 */
export async function runExclusiveTransaction<T>(
  db: SQLite.SQLiteDatabase,
  task: (tx: ExclusiveTransaction) => Promise<T>,
): Promise<T> {
  let result!: T;

  await db.withExclusiveTransactionAsync(async (tx) => {
    result = await task(tx);
  });

  return result;
}

export async function getDatabase() {
  if (database) return database;

  database = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
  `);

  return database;
}
