import type { SQLiteDatabase } from "expo-sqlite";
import { getDatabase, runExclusiveTransaction } from "../database";
import { findOrCreateCustomer } from "../repositories/customer.repository";
import { MemberService } from "./member.service";
import type {
  CreateOrderInput,
  MemberPackage,
  MemberSubscriptionWithBalance,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  OrderWithDetails,
  Payment,
  PaymentStatus,
  PrintLog,
  Service,
  UpdateOrderInput,
  WhatsAppLog,
} from "../types/database";
import { generateOrderNumber } from "../utils/order-number";
import {
  MAX_CUSTOMER_NAME_LENGTH,
  isValidPhone,
  normalizeName,
  normalizePhone,
} from "../utils/phone";

export async function createOrder(input: CreateOrderInput) {
  const db = await getDatabase();

  if (!input.items || !input.items.length) {
    throw new Error("Order harus memiliki minimal satu item");
  }

  return runExclusiveTransaction(db, async (tx) => {
    // 1. RESOLVE / BUAT PELANGGAN
    let customerId: number | null = null;
    let customerName: string | null = null;
    let customerPhone: string | null = null;

    if (typeof input.customer_id === "number") {
      const customer = await tx.getFirstAsync<{
        id: number;
        name: string;
        phone: string | null;
      }>(
        `SELECT id, name, phone FROM customers WHERE id = ? AND deleted_at IS NULL`,
        input.customer_id,
      );
      if (!customer) throw new Error("Pelanggan tidak ditemukan");
      customerId = customer.id;
      customerName = customer.name;
      customerPhone = customer.phone;
    } else {
      const name = normalizeName(input.customer_name);
      if (!name) {
        throw new Error("Pilih pelanggan atau isi nama pelanggan baru");
      }
      if (name.length > MAX_CUSTOMER_NAME_LENGTH) {
        throw new Error(
          `Nama pelanggan maksimal ${MAX_CUSTOMER_NAME_LENGTH} karakter`,
        );
      }
      const phone = normalizePhone(input.customer_phone);
      if (phone && !isValidPhone(phone)) {
        throw new Error("Nomor WhatsApp tidak valid (8-15 digit)");
      }

      // Otomatis simpan ke tabel customers (Laundrify v2)
      const customer = await findOrCreateCustomer(name, phone, tx);
      customerId = customer.id;
      customerName = customer.name;
      customerPhone = customer.phone;
    }

    // 2. PROSES ITEM ORDER & PEMAKAIAN KUOTA
    const processedItems: Array<{
      item_type: "service" | "package";
      service_id: number | null;
      package_id: number | null;
      service_name: string;
      unit: string;
      quantity: number;
      price: number;
      subtotal: number;
      paid_by_subscription_id: number | null;
      notes: string | null;
      quota_usage_kg?: number;
      subscription_id_for_usage?: number;
    }> = [];

    let subtotal = 0;
    let memberDiscount = 0;
    let createdSubscriptionPackage: MemberPackage | null = null;
    const usedInCurrentTx: Record<number, number> = {};

    for (const item of input.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error("Jumlah item tidak valid");
      }

      // Beli paket member baru
      if (item.item_type === "package" || (item.package_id && !item.service_id)) {
        const pkg = await tx.getFirstAsync<MemberPackage>(
          `SELECT * FROM member_packages WHERE id = ? AND is_active = 1`,
          Number(item.package_id),
        );
        if (!pkg) throw new Error("Paket member tidak ditemukan");

        const lineSubtotal = pkg.price;
        subtotal += lineSubtotal;

        processedItems.push({
          item_type: "package",
          service_id: null,
          package_id: pkg.id,
          service_name: pkg.name,
          unit: "paket",
          quantity: 1,
          price: pkg.price,
          subtotal: lineSubtotal,
          paid_by_subscription_id: null,
          notes: item.notes ?? null,
        });

        createdSubscriptionPackage = pkg;
        continue;
      }

      // Layanan biasa
      const svc = await tx.getFirstAsync<Service>(
        `SELECT * FROM services WHERE id = ? AND is_active = 1`,
        Number(item.service_id),
      );
      if (!svc) {
        throw new Error(`Layanan ${item.service_id} tidak ditemukan`);
      }

      // Cek apakah item memakai kuota langganan aktif
      if (item.use_subscription_id && customerId) {
        const sub = await tx.getFirstAsync<MemberSubscriptionWithBalance>(
          `SELECT * FROM v_subscription_balance
           WHERE id = ? AND customer_id = ? AND status = 'active'`,
          item.use_subscription_id,
          customerId,
        );

        if (sub && svc.category === "kiloan" && svc.package_type === sub.package_type) {
          const alreadyUsed = usedInCurrentTx[sub.id] || 0;
          const available = Math.max(0, sub.remaining_kg - alreadyUsed);

          if (available >= item.quantity) {
            // Kuota cukup penuh
            const lineSubtotal = Math.round(item.quantity * svc.price);
            subtotal += lineSubtotal;
            memberDiscount += lineSubtotal;

            processedItems.push({
              item_type: "service",
              service_id: svc.id,
              package_id: null,
              service_name: svc.name,
              unit: svc.unit,
              quantity: item.quantity,
              price: svc.price,
              subtotal: lineSubtotal,
              paid_by_subscription_id: sub.id,
              notes: item.notes ?? null,
              quota_usage_kg: item.quantity,
              subscription_id_for_usage: sub.id,
            });

            usedInCurrentTx[sub.id] = alreadyUsed + item.quantity;
            continue;
          } else if (available > 0) {
            // Kuota sebagian -> pecah menjadi 2 item: bagian kuota & bagian tunai
            const quotaQty = available;
            const quotaSubtotal = Math.round(quotaQty * svc.price);
            subtotal += quotaSubtotal;
            memberDiscount += quotaSubtotal;

            processedItems.push({
              item_type: "service",
              service_id: svc.id,
              package_id: null,
              service_name: svc.name,
              unit: svc.unit,
              quantity: quotaQty,
              price: svc.price,
              subtotal: quotaSubtotal,
              paid_by_subscription_id: sub.id,
              notes: item.notes
                ? `${item.notes} (Potongan Kuota)`
                : "(Potongan Kuota Member)",
              quota_usage_kg: quotaQty,
              subscription_id_for_usage: sub.id,
            });

            const normalQty = Math.round((item.quantity - available) * 100) / 100;
            const normalSubtotal = Math.round(normalQty * svc.price);
            subtotal += normalSubtotal;

            processedItems.push({
              item_type: "service",
              service_id: svc.id,
              package_id: null,
              service_name: svc.name,
              unit: svc.unit,
              quantity: normalQty,
              price: svc.price,
              subtotal: normalSubtotal,
              paid_by_subscription_id: null,
              notes: item.notes ?? null,
            });

            usedInCurrentTx[sub.id] = alreadyUsed + quotaQty;
            continue;
          }
        }
      }

      // Layanan reguler (tanpa kuota)
      const lineSubtotal = Math.round(item.quantity * svc.price);
      subtotal += lineSubtotal;

      processedItems.push({
        item_type: "service",
        service_id: svc.id,
        package_id: null,
        service_name: svc.name,
        unit: svc.unit,
        quantity: item.quantity,
        price: svc.price,
        subtotal: lineSubtotal,
        paid_by_subscription_id: null,
        notes: item.notes ?? null,
      });
    }

    // 3. HITUNG DISKON & TOTAL
    const discount = Math.max(0, input.discount ?? 0);
    const maxDiscount = subtotal - memberDiscount;

    if (discount > maxDiscount) {
      throw new Error(
        "Diskon manual tidak boleh melebihi sisa total setelah diskon kuota",
      );
    }

    const total = Math.max(0, subtotal - memberDiscount - discount);

    // 4. PEMBAYARAN AWAL
    let paidAmount = 0;
    let paymentStatus: PaymentStatus = total === 0 ? "paid" : "unpaid";

    if (input.initial_payment && input.initial_payment.amount > 0) {
      if (input.initial_payment.amount > total) {
        throw new Error(
          "Nominal pembayaran tidak boleh melebihi total pesanan",
        );
      }
      paidAmount = input.initial_payment.amount;
      paymentStatus = paidAmount >= total ? "paid" : "partial";
    }

    // 5. SIMPAN PESANAN
    const orderNumber = generateOrderNumber();

    const orderRes = await tx.runAsync(
      `INSERT INTO orders (
        order_number,
        customer_id,
        customer_name,
        customer_phone,
        estimated_completion,
        status,
        payment_status,
        subtotal,
        member_discount,
        discount,
        total,
        paid_amount,
        notes
      ) VALUES (?, ?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?, ?)`,
      orderNumber,
      customerId,
      customerName,
      customerPhone,
      input.estimated_completion ?? null,
      paymentStatus,
      subtotal,
      memberDiscount,
      discount,
      total,
      paidAmount,
      input.notes ?? null,
    );

    const orderId = orderRes.lastInsertRowId;

    // 6. SIMPAN ORDER ITEMS & CATAT MEMBER USAGES
    for (const it of processedItems) {
      const itemRes = await tx.runAsync(
        `INSERT INTO order_items (
          order_id,
          item_type,
          service_id,
          package_id,
          service_name,
          unit,
          quantity,
          price,
          subtotal,
          paid_by_subscription_id,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderId,
        it.item_type,
        it.service_id,
        it.package_id,
        it.service_name,
        it.unit,
        it.quantity,
        it.price,
        it.subtotal,
        it.paid_by_subscription_id,
        it.notes,
      );

      const orderItemId = itemRes.lastInsertRowId;

      if (it.quota_usage_kg && it.subscription_id_for_usage) {
        await tx.runAsync(
          `INSERT INTO member_usages (
            subscription_id,
            order_id,
            order_item_id,
            kg_used,
            used_at
          ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          it.subscription_id_for_usage,
          orderId,
          orderItemId,
          it.quota_usage_kg,
        );
      }
    }

    // 7. PERBARUI STATUS LANGGANAN JIKA KUOTA HABIS (USED_UP)
    for (const subIdStr of Object.keys(usedInCurrentTx)) {
      const subId = Number(subIdStr);
      const bal = await tx.getFirstAsync<{ remaining_kg: number }>(
        `SELECT remaining_kg FROM v_subscription_balance WHERE id = ?`,
        subId,
      );
      if (bal && bal.remaining_kg <= 0) {
        await tx.runAsync(
          `UPDATE member_subscriptions SET status = 'used_up', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          subId,
        );
      }
    }

    // 8. JIKA BELI PAKET MEMBER: BUAT LANGGANAN BARU
    let createdSubscriptionId: number | null = null;
    if (createdSubscriptionPackage && customerId) {
      const memberNo = await MemberService.generateMemberNo(tx);
      const subRes = await tx.runAsync(
        `INSERT INTO member_subscriptions (
          member_no,
          customer_id,
          package_id,
          package_name,
          package_type,
          quota_kg,
          price_paid,
          start_date,
          purchase_order_id,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'active')`,
        memberNo,
        customerId,
        createdSubscriptionPackage.id,
        createdSubscriptionPackage.name,
        createdSubscriptionPackage.package_type,
        createdSubscriptionPackage.quota_kg,
        createdSubscriptionPackage.price,
        orderId,
      );
      createdSubscriptionId = subRes.lastInsertRowId;
    }

    // 9. SIMPAN PEMBAYARAN AWAL & KAS
    if (input.initial_payment && paidAmount > 0) {
      const payRes = await tx.runAsync(
        `INSERT INTO payments (
          order_id, amount, method, reference_number, notes
        ) VALUES (?, ?, ?, ?, ?)`,
        orderId,
        paidAmount,
        input.initial_payment.method,
        input.initial_payment.reference_number ?? null,
        input.initial_payment.notes ?? "Pembayaran saat buat order",
      );

      const cashCat = await tx.getFirstAsync<{ id: number }>(
        `SELECT id FROM cash_categories WHERE name = 'Pembayaran Laundry' AND type = 'income'`,
      );

      if (cashCat) {
        await tx.runAsync(
          `INSERT INTO cash_transactions (
            category_id, payment_id, direction, amount, description
          ) VALUES (?, ?, 'income', ?, ?)`,
          cashCat.id,
          payRes.lastInsertRowId,
          paidAmount,
          `Pembayaran order ${orderNumber}`,
        );
      }
    }

    // 10. CATAT RIWAYAT STATUS
    await tx.runAsync(
      `INSERT INTO order_status_history (
        order_id, old_status, new_status, notes
      ) VALUES (?, NULL, 'received', 'Order dibuat')`,
      orderId,
    );

    // 11. UPDATE JUMLAH ORDER PELANGGAN
    if (customerId) {
      await tx.runAsync(
        `UPDATE customers
         SET total_orders = total_orders + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        customerId,
      );
    }

    return {
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      subtotal,
      member_discount: memberDiscount,
      discount,
      total,
      paid_amount: paidAmount,
      payment_status: paymentStatus,
      created_subscription_id: createdSubscriptionId,
    };
  });
}

export async function updateOrder(id: number, input: UpdateOrderInput) {
  const db = await getDatabase();

  return runExclusiveTransaction(db, async (tx) => {
    const order = await tx.getFirstAsync<{
      id: number;
      customer_id: number | null;
      customer_name: string | null;
      customer_phone: string | null;
      total: number;
      status: OrderStatus;
      deleted_at: string | null;
    }>(
      `SELECT id, customer_id, customer_name, customer_phone,
              total, status, deleted_at
       FROM orders WHERE id = ?`,
      id,
    );

    if (!order || order.deleted_at) {
      throw new Error("Order tidak ditemukan");
    }

    if (["completed", "cancelled"].includes(order.status)) {
      throw new Error("Order selesai atau dibatalkan tidak bisa diedit");
    }

    const paid = await tx.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payments WHERE order_id = ? AND is_void = 0`,
      id,
    );

    let newSubtotal: number;
    let newDiscount: number;
    let newTotal: number;

    if (input.items !== undefined) {
      if (!input.items.length) {
        throw new Error("Order harus memiliki minimal satu item");
      }

      newSubtotal = 0;
      const newItems = [];

      for (const item of input.items) {
        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
          throw new Error("Jumlah item tidak valid");
        }

        const service = await tx.getFirstAsync<Service>(
          `SELECT * FROM services WHERE id = ? AND is_active = 1`,
          Number(item.service_id),
        );

        if (!service) throw new Error("Layanan tidak ditemukan");

        const lineTotal = Math.round(item.quantity * service.price);
        newSubtotal += lineTotal;

        newItems.push({ ...item, service, lineTotal });
      }

      newDiscount = input.discount ?? 0;
      if (newDiscount < 0 || newDiscount > newSubtotal) {
        throw new Error("Diskon tidak valid");
      }

      newTotal = newSubtotal - newDiscount;

      if (newTotal < (paid?.total ?? 0)) {
        throw new Error(
          "Total baru lebih kecil dari pembayaran yang sudah diterima",
        );
      }

      await tx.runAsync(`DELETE FROM order_items WHERE order_id = ?`, id);

      for (const item of newItems) {
        await tx.runAsync(
          `INSERT INTO order_items
           (order_id, service_id, service_name, unit,
            quantity, price, subtotal, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          item.service.id,
          item.service.name,
          item.service.unit,
          item.quantity,
          item.service.price,
          item.lineTotal,
          item.notes ?? null,
        );
      }
    } else {
      const current = await tx.getFirstAsync<{
        subtotal: number;
        discount: number;
      }>(`SELECT subtotal, discount FROM orders WHERE id = ?`, id);

      newSubtotal = current!.subtotal;
      newDiscount = input.discount ?? current!.discount;

      if (newDiscount < 0 || newDiscount > newSubtotal) {
        throw new Error("Diskon tidak valid");
      }

      newTotal = newSubtotal - newDiscount;

      if (newTotal < (paid?.total ?? 0)) {
        throw new Error("Total baru lebih kecil dari pembayaran");
      }
    }

    const currentPaid = paid?.total ?? 0;
    const paymentStatus: PaymentStatus =
      currentPaid >= newTotal ? "paid" : currentPaid > 0 ? "partial" : "unpaid";

    await tx.runAsync(
      `UPDATE orders SET
        subtotal = ?,
        discount = ?,
        total = ?,
        payment_status = ?,
        estimated_completion = COALESCE(?, estimated_completion),
        notes = COALESCE(?, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      newSubtotal,
      newDiscount,
      newTotal,
      paymentStatus,
      input.estimated_completion ?? null,
      input.notes ?? null,
      id,
    );

    return {
      id,
      subtotal: newSubtotal,
      discount: newDiscount,
      total: newTotal,
    };
  });
}

/**
 * State machine transisi status pesanan (Laundrify v2):
 * received (Diterima) -> processing (Diproses) -> ready (SiapDiambil) -> completed (Selesai)
 */
export async function updateOrderStatus(
  id: number,
  newStatus: OrderStatus,
  notes?: string,
) {
  const db = await getDatabase();

  return runExclusiveTransaction(db, async (tx) => {
    const order = await tx.getFirstAsync<{
      status: OrderStatus;
      deleted_at: string | null;
    }>(`SELECT status, deleted_at FROM orders WHERE id = ?`, id);

    if (!order || order.deleted_at) {
      throw new Error("Order tidak ditemukan");
    }

    if (order.status === "completed") {
      throw new Error("Pesanan yang sudah selesai tidak dapat diubah statusnya");
    }

    const isCompleted = newStatus === "completed";

    await tx.runAsync(
      `UPDATE orders
       SET status = ?,
           completed_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      newStatus,
      isCompleted ? 1 : 0,
      id,
    );

    await tx.runAsync(
      `INSERT INTO order_status_history
       (order_id, old_status, new_status, notes)
       VALUES (?, ?, ?, ?)`,
      id,
      order.status,
      newStatus,
      notes ?? null,
    );

    return true;
  });
}

export const changeOrderStatus = updateOrderStatus;

export async function deleteOrder(id: number) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE orders
     SET deleted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?
       AND deleted_at IS NULL
       AND status != 'completed'
       AND NOT EXISTS (
         SELECT 1 FROM payments
         WHERE payments.order_id = orders.id
         AND payments.is_void = 0
       )`,
    id,
  );

  if (!result.changes) {
    throw new Error(
      "Order tidak ditemukan atau sudah memiliki pembayaran / berstatus final",
    );
  }

  return true;
}

export async function getOrderById(id: number): Promise<
  | (OrderWithDetails & {
      is_manual_customer: number;
      created_subscription?: { id: number; member_no: string; package_name: string } | null;
      print_logs?: PrintLog[];
      whatsapp_logs?: WhatsAppLog[];
    })
  | null
> {
  const db = await getDatabase();

  const order = await db.getFirstAsync<
    Order & {
      is_manual_customer: number;
    }
  >(
    `SELECT o.id, o.order_number, o.customer_id, o.order_date,
            o.estimated_completion, o.completed_at, o.status,
            o.payment_status, o.subtotal, o.member_discount, o.discount,
            o.total, o.paid_amount, o.notes, o.created_at, o.updated_at, o.deleted_at,
            COALESCE(c.name, o.customer_name, 'Pelanggan umum') AS customer_name,
            COALESCE(c.phone, o.customer_phone) AS customer_phone,
            CASE WHEN o.customer_id IS NULL THEN 1 ELSE 0 END AS is_manual_customer
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     WHERE o.id = ? AND o.deleted_at IS NULL`,
    id,
  );

  if (!order) return null;

  const [items, payments, statusHistory, createdSub, printLogs, waLogs] =
    await Promise.all([
      db.getAllAsync<OrderItem>(
        `SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC`,
        id,
      ),
      db.getAllAsync<Payment>(
        `SELECT * FROM payments WHERE order_id = ? AND is_void = 0 ORDER BY payment_date DESC`,
        id,
      ),
      db.getAllAsync<OrderStatusHistory>(
        `SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC`,
        id,
      ),
      db.getFirstAsync<{ id: number; member_no: string; package_name: string }>(
        `SELECT id, member_no, package_name FROM member_subscriptions WHERE purchase_order_id = ?`,
        id,
      ),
      db.getAllAsync<PrintLog>(
        `SELECT * FROM print_logs WHERE order_id = ? ORDER BY printed_at DESC`,
        id,
      ),
      db.getAllAsync<WhatsAppLog>(
        `SELECT * FROM whatsapp_logs WHERE order_id = ? ORDER BY created_at DESC`,
        id,
      ),
    ]);

  const paid = payments.reduce((sum, p) => sum + p.amount, 0);

  return {
    ...order,
    items,
    payments,
    paid,
    remaining: Math.max(0, order.total - paid),
    status_history: statusHistory,
    created_subscription: createdSub ?? null,
    print_logs: printLogs,
    whatsapp_logs: waLogs,
  };
}

export async function getOrders(options?: {
  search?: string;
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();

  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const search = options?.search?.trim() ?? "";

  return db.getAllAsync(
    `SELECT
       o.id, o.order_number, o.customer_id, o.order_date,
       o.estimated_completion, o.status, o.payment_status,
       o.subtotal, o.member_discount, o.discount, o.total,
       o.notes, o.created_at, o.updated_at, o.deleted_at,
       COALESCE(c.name, o.customer_name, 'Pelanggan umum') AS customer_name,
       COALESCE(c.phone, o.customer_phone) AS customer_phone,
       CASE WHEN o.customer_id IS NULL THEN 1 ELSE 0 END AS is_manual_customer,
       COALESCE(p.paid, 0) AS paid,
       o.total - COALESCE(p.paid, 0) AS remaining
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN (
       SELECT order_id, SUM(amount) AS paid
       FROM payments
       WHERE is_void = 0
       GROUP BY order_id
     ) p ON p.order_id = o.id
     WHERE o.deleted_at IS NULL
       AND (? = '' OR o.order_number LIKE ?
         OR COALESCE(c.name, o.customer_name, '') LIKE ? COLLATE NOCASE
         OR COALESCE(c.phone, o.customer_phone, '') LIKE ?)
       AND (? IS NULL OR o.status = ?)
     ORDER BY o.order_date DESC, o.id DESC
     LIMIT ? OFFSET ?`,
    search,
    `%${search}%`,
    `%${search}%`,
    `%${search}%`,
    options?.status ?? null,
    options?.status ?? null,
    limit,
    offset,
  );
}
