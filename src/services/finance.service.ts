import { getDatabase } from "../database";
import type { CashDirection } from "../types/database";
import { toSqliteUtcTimestamp } from "../utils/format";

export interface FinanceInput {
  category_id: number;
  direction: CashDirection;
  amount: number;
  description: string;
  transaction_date?: string;
}

export async function createTransaction(input: FinanceInput) {
  const db = await getDatabase();

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Nominal transaksi tidak valid");
  }

  if (!input.description.trim()) {
    throw new Error("Keterangan wajib diisi");
  }

  const category = await db.getFirstAsync<{
    id: number;
    type: string;
    is_active: number;
  }>(
    `SELECT id, type, is_active
     FROM cash_categories WHERE id = ?`,
    input.category_id,
  );

  if (!category || !category.is_active) {
    throw new Error("Kategori tidak ditemukan atau tidak aktif");
  }

  if (category.type !== input.direction) {
    throw new Error("Jenis transaksi tidak sesuai kategori");
  }

  const result = await db.runAsync(
    `INSERT INTO cash_transactions (
      category_id,
      direction,
      amount,
      description,
      transaction_date
    ) VALUES (?, ?, ?, ?, ?)`,
    input.category_id,
    input.direction,
    input.amount,
    input.description.trim(),
    input.transaction_date ?? toSqliteUtcTimestamp(),
  );

  return db.getFirstAsync(
    `SELECT
      t.*,
      c.name AS category_name
     FROM cash_transactions t
     JOIN cash_categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    result.lastInsertRowId,
  );
}

export async function getTransactions(options?: {
  direction?: CashDirection;
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();

  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  const conditions = ["t.is_void = 0"];
  const params: (string | number)[] = [];

  if (options?.direction) {
    conditions.push("t.direction = ?");
    params.push(options.direction);
  }
  if (options?.startDate) {
    conditions.push("t.transaction_date >= ?");
    params.push(options.startDate);
  }
  if (options?.endDate) {
    conditions.push("t.transaction_date < ?");
    params.push(options.endDate);
  }
  if (options?.categoryId !== undefined) {
    conditions.push("t.category_id = ?");
    params.push(options.categoryId);
  }

  return db.getAllAsync(
    `SELECT
      t.*,
      c.name AS category_name
     FROM cash_transactions t
     JOIN cash_categories c ON c.id = t.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY t.transaction_date DESC, t.id DESC
     LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );
}
