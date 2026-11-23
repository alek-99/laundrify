import { getDatabase, runExclusiveTransaction } from "../database";
import type { PaymentMethod } from "../types/database";

interface PaymentInput {
  orderId: number;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
}

export async function createPayment(input: PaymentInput) {
  const db = await getDatabase();

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error("Nominal pembayaran tidak valid");
  }

  return runExclusiveTransaction(db, async (tx) => {
    const order = await tx.getFirstAsync<{
      id: number;
      total: number;
      status: string;
      deleted_at: string | null;
    }>(
      `SELECT id, total, status, deleted_at
       FROM orders WHERE id = ?`,
      input.orderId,
    );

    if (!order || order.deleted_at || order.status === "cancelled") {
      throw new Error("Order tidak dapat menerima pembayaran");
    }

    const paid = await tx.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE order_id = ? AND is_void = 0`,
      input.orderId,
    );

    const remaining = order.total - (paid?.total ?? 0);

    if (input.amount > remaining) {
      throw new Error("Nominal melebihi sisa pembayaran");
    }

    const category = await tx.getFirstAsync<{ id: number }>(
      `SELECT id FROM cash_categories
       WHERE name = 'Pembayaran Laundry'
         AND type = 'income'`,
    );

    if (!category) {
      throw new Error("Kategori pembayaran laundry belum tersedia");
    }

    const payment = await tx.runAsync(
      `INSERT INTO payments (
        order_id, amount, method, reference_number, notes
      ) VALUES (?, ?, ?, ?, ?)`,
      input.orderId,
      input.amount,
      input.method,
      input.referenceNumber ?? null,
      input.notes ?? null,
    );

    await tx.runAsync(
      `INSERT INTO cash_transactions (
        category_id,
        payment_id,
        direction,
        amount,
        description
      ) VALUES (?, ?, 'income', ?, ?)`,
      category.id,
      payment.lastInsertRowId,
      input.amount,
      `Pembayaran order ${input.orderId}`,
    );

    return {
      paymentId: payment.lastInsertRowId,
      amount: input.amount,
      remaining: remaining - input.amount,
    };
  });
}

export async function getPayments(orderId: number) {
  const db = await getDatabase();

  return db.getAllAsync(
    `SELECT * FROM payments
     WHERE order_id = ?
     ORDER BY payment_date DESC`,
    orderId,
  );
}

export async function getPaymentById(id: number) {
  const db = await getDatabase();

  return db.getFirstAsync(`SELECT * FROM payments WHERE id = ?`, id);
}

// Pembatalan pembayaran harus disertai
// pencatatan pengembalian dana.
export async function refundPayment(paymentId: number, notes: string) {
  const db = await getDatabase();

  return runExclusiveTransaction(db, async (tx) => {
    const payment = await tx.getFirstAsync<{
      id: number;
      order_id: number;
      amount: number;
      is_void: number;
    }>(
      `SELECT id, order_id, amount, is_void
       FROM payments WHERE id = ?`,
      paymentId,
    );

    if (!payment || payment.is_void) {
      throw new Error("Pembayaran tidak ditemukan atau sudah dibatalkan");
    }

    const category = await tx.getFirstAsync<{ id: number }>(
      `SELECT id FROM cash_categories
       WHERE name = 'Pengembalian Pembayaran'
         AND type = 'expense'`,
    );

    if (!category) {
      throw new Error("Buat kategori Pengembalian Pembayaran terlebih dahulu");
    }

    await tx.runAsync(
      `UPDATE payments SET is_void = 1 WHERE id = ?`,
      paymentId,
    );

    await tx.runAsync(
      `UPDATE cash_transactions
   SET is_void = 1,
       description = ?
   WHERE payment_id = ?`,
      `Pembayaran dibatalkan: ${notes}`,
      paymentId,
    );

    await tx.runAsync(
      `INSERT INTO cash_transactions (
        category_id,
        direction,
        amount,
        description
      ) VALUES (?, 'expense', ?, ?)`,
      category.id,
      payment.amount,
      `Refund pembayaran order ${payment.order_id}: ${notes}`,
    );

    return true;
  });
}
