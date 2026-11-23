import { getDatabase, runExclusiveTransaction } from "../database";
import type { CashDirection } from "../types/database";

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
    input.transaction_date ?? new Date().toISOString(),
  );

  return getTransactionById(result.lastInsertRowId);
}

export async function getTransactionById(id: number) {
  const db = await getDatabase();

  return db.getFirstAsync(
    `SELECT
      t.*,
      c.name AS category_name
     FROM cash_transactions t
     JOIN cash_categories c ON c.id = t.category_id
     WHERE t.id = ?`,
    id,
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

  return db.getAllAsync(
    `SELECT
      t.*,
      c.name AS category_name
     FROM cash_transactions t
     JOIN cash_categories c ON c.id = t.category_id
     WHERE t.is_void = 0
       AND (? IS NULL OR t.direction = ?)
       AND (? IS NULL OR t.transaction_date >= ?)
       AND (? IS NULL OR t.transaction_date < ?)
       AND (? IS NULL OR t.category_id = ?)
     ORDER BY t.transaction_date DESC, t.id DESC
     LIMIT ? OFFSET ?`,
    options?.direction ?? null,
    options?.direction ?? null,
    options?.startDate ?? null,
    options?.startDate ?? null,
    options?.endDate ?? null,
    options?.endDate ?? null,
    options?.categoryId ?? null,
    options?.categoryId ?? null,
    limit,
    offset,
  );
}

export async function updateTransaction(id: number, input: FinanceInput) {
  const db = await getDatabase();

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Nominal tidak valid");
  }

  return runExclusiveTransaction(db, async (tx) => {
    const old = await tx.getFirstAsync<{
      payment_id: number | null;
    }>(`SELECT payment_id FROM cash_transactions WHERE id = ?`, id);

    if (!old) throw new Error("Transaksi tidak ditemukan");

    if (old.payment_id !== null) {
      throw new Error("Pemasukan pembayaran order tidak boleh diedit manual");
    }

    const category = await tx.getFirstAsync<{
      type: string;
      is_active: number;
    }>(
      `SELECT type, is_active FROM cash_categories WHERE id = ?`,
      input.category_id,
    );

    if (!category || !category.is_active || category.type !== input.direction) {
      throw new Error("Kategori tidak sesuai");
    }

    await tx.runAsync(
      `UPDATE cash_transactions SET
        category_id = ?,
        direction = ?,
        amount = ?,
        description = ?,
        transaction_date = ?
       WHERE id = ?`,
      input.category_id,
      input.direction,
      input.amount,
      input.description.trim(),
      input.transaction_date ?? new Date().toISOString(),
      id,
    );

    return true;
  });
}

export async function deleteTransaction(id: number) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `DELETE FROM cash_transactions
     WHERE id = ? AND payment_id IS NULL`,
    id,
  );

  if (!result.changes) {
    throw new Error(
      "Transaksi tidak ditemukan atau berasal dari pembayaran order",
    );
  }

  return true;
}
