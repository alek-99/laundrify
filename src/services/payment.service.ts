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
