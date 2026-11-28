import { getDatabase } from "../database";
import { getLocalDayRangeUtc } from "../utils/format";

export interface DashboardData {
  todayIncome: number;
  todayPayments: number;
  totalOrders: number;
  activeOrders: number;
  unpaidOrders: number;
  totalCustomers: number;
  recentOrders: {
    id: number;
    order_number: string;
    customer_name: string;
    status: string;
    total: number;
    paid: number;
    remaining: number;
    order_date: string;
    services: string | null;
  }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const db = await getDatabase();
  const { start, end } = getLocalDayRangeUtc();

  const [income, orders, customers, recentOrders] = await Promise.all([
    db.getFirstAsync<{ total: number; transactions: number }>(
      `SELECT
         COALESCE(SUM(amount), 0) AS total,
         COUNT(*) AS transactions
       FROM payments
       WHERE is_void = 0
         AND payment_date >= ?
         AND payment_date < ?`,
      start,
      end,
    ),
    db.getFirstAsync<{
      total: number;
      active: number;
      unpaid: number;
    }>(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE
           WHEN status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0
         END), 0) AS active,
         COALESCE(SUM(CASE
           WHEN paid_amount < total THEN 1 ELSE 0
         END), 0) AS unpaid
       FROM orders
       WHERE deleted_at IS NULL`,
    ),
    db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM customers
       WHERE deleted_at IS NULL`,
    ),
    db.getAllAsync<DashboardData["recentOrders"][number]>(
      `SELECT
         o.id,
         o.order_number,
         COALESCE(c.name, o.customer_name, 'Pelanggan umum') AS customer_name,
         o.status,
         o.total,
         o.paid_amount AS paid,
         MAX(0, o.total - o.paid_amount) AS remaining,
         o.order_date,
         (
           SELECT group_concat(x.service_name, ', ')
           FROM (
             SELECT DISTINCT service_name
             FROM order_items
             WHERE order_id = o.id
           ) x
         ) AS services
       FROM orders o
       LEFT JOIN customers c ON c.id = o.customer_id
       WHERE o.deleted_at IS NULL
       ORDER BY o.order_date DESC, o.id DESC
       LIMIT 5`,
    ),
  ]);

  return {
    todayIncome: income?.total ?? 0,
    todayPayments: income?.transactions ?? 0,
    totalOrders: orders?.total ?? 0,
    activeOrders: orders?.active ?? 0,
    unpaidOrders: orders?.unpaid ?? 0,
    totalCustomers: customers?.total ?? 0,
    recentOrders,
  };
}
