import { getDatabase } from "../database";
import type {
  MemberPackage,
  MemberSubscriptionWithBalance,
  MemberUsage,
  PackageType,
} from "../types/database";

export type SubscriptionListRow = MemberSubscriptionWithBalance & {
  customer_name: string;
  customer_phone: string | null;
};

export interface SubscriptionStats {
  total: number;
  active: number;
  usedUp: number;
  remainingKg: number;
}

export class MemberService {
  /**
   * Ambil ringkasan statistik membership langsung di SQLite tanpa memuat seluruh kartu ke memori.
   */
  static async getSubscriptionStatistics(): Promise<SubscriptionStats> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{
      total: number;
      active: number;
      used_up: number;
      active_quota: number;
      active_used: number;
    }>(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
         COALESCE(SUM(CASE WHEN status = 'used_up' THEN 1 ELSE 0 END), 0) AS used_up,
         COALESCE(SUM(CASE WHEN status = 'active' THEN quota_kg ELSE 0 END), 0) AS active_quota,
         COALESCE((
           SELECT SUM(u.kg_used)
           FROM member_usages u
           JOIN member_subscriptions s ON s.id = u.subscription_id
           WHERE s.status = 'active' AND u.is_void = 0
         ), 0) AS active_used
       FROM member_subscriptions`,
    );

    const activeQuota = Number(row?.active_quota ?? 0);
    const activeUsed = Number(row?.active_used ?? 0);

    return {
      total: Number(row?.total ?? 0),
      active: Number(row?.active ?? 0),
      usedUp: Number(row?.used_up ?? 0),
      remainingKg: Math.max(0, activeQuota - activeUsed),
    };
  }

  /**
   * Ambil daftar membership berhalaman beserta saldo kuota (filter di SQL sebelum agregasi).
   */
  static async getAllSubscriptions(
    options:
      | string
      | {
          search?: string;
          status?: "all" | "active" | "used_up" | "cancelled";
          limit?: number;
          offset?: number;
        } = {},
  ): Promise<{ rows: SubscriptionListRow[]; hasMore: boolean }> {
    const db = await getDatabase();
    const opts = typeof options === "string" ? { search: options } : options;
    const keyword = (opts.search ?? "").trim();
    const status = opts.status ?? "all";
    const limit = Math.min(Math.max(opts.limit ?? 40, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status !== "all") {
      conditions.push("s.status = ?");
      params.push(status);
    }

    if (keyword) {
      const pattern = `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;
      conditions.push(
        `(c.name LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR s.member_no LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR s.package_name LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR COALESCE(c.phone, '') LIKE ? ESCAPE '\\')`,
      );
      params.push(pattern, pattern, pattern, pattern);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const fetched = await db.getAllAsync<SubscriptionListRow>(
      `WITH page AS (
         SELECT
           s.*,
           c.name AS customer_name,
           c.phone AS customer_phone
         FROM member_subscriptions s
         INNER JOIN customers c ON c.id = s.customer_id
         ${whereSql}
         ORDER BY
           CASE s.status
             WHEN 'active' THEN 1
             WHEN 'used_up' THEN 2
             ELSE 3
           END,
           s.created_at DESC,
           s.id DESC
         LIMIT ? OFFSET ?
       )
       SELECT
         p.*,
         COALESCE(SUM(CASE WHEN u.is_void = 0 THEN u.kg_used END), 0) AS used_kg,
         p.quota_kg - COALESCE(SUM(CASE WHEN u.is_void = 0 THEN u.kg_used END), 0) AS remaining_kg
       FROM page p
       LEFT JOIN member_usages u ON u.subscription_id = p.id
       GROUP BY p.id
       ORDER BY
         CASE p.status
           WHEN 'active' THEN 1
           WHEN 'used_up' THEN 2
           ELSE 3
         END,
         p.created_at DESC,
         p.id DESC`,
      ...params,
      limit + 1,
      offset,
    );

    const hasMore = fetched.length > limit;
    return {
      rows: hasMore ? fetched.slice(0, limit) : fetched,
      hasMore,
    };
  }
  static async getMemberPackages(): Promise<MemberPackage[]> {
    const db = await getDatabase();
    return db.getAllAsync<MemberPackage>(
      `SELECT * FROM member_packages WHERE is_active = 1 ORDER BY quota_kg DESC`,
    );
  }

  /**
   * Ambil langganan aktif milik customer tertentu beserta sisa kuota
   */
  static async getCustomerActiveSubscriptions(
    customerId: number,
    packageType?: PackageType,
  ): Promise<MemberSubscriptionWithBalance[]> {
    const db = await getDatabase();
    const params: any[] = [customerId];
    let typeFilter = "";
    if (packageType) {
      typeFilter = "AND package_type = ?";
      params.push(packageType);
    }

    return db.getAllAsync<MemberSubscriptionWithBalance>(
      `SELECT * FROM v_subscription_balance
       WHERE customer_id = ?
         AND status = 'active'
         AND remaining_kg > 0
         ${typeFilter}
       ORDER BY id ASC`,
      ...params,
    );
  }

  /**
   * Ambil langganan berdasarkan ID
   */
  static async getSubscriptionById(
    id: number,
  ): Promise<MemberSubscriptionWithBalance | null> {
    const db = await getDatabase();
    return db.getFirstAsync<MemberSubscriptionWithBalance>(
      `SELECT * FROM v_subscription_balance WHERE id = ?`,
      id,
    );
  }

  /**
   * Ambil riwayat pemakaian kartu langganan
   */
  static async getSubscriptionUsages(
    subscriptionId: number,
  ): Promise<MemberUsage[]> {
    const db = await getDatabase();
    return db.getAllAsync<MemberUsage>(
      `SELECT * FROM member_usages
       WHERE subscription_id = ? AND is_void = 0
       ORDER BY used_at ASC, id ASC`,
      subscriptionId,
    );
  }

  /**
   * Generate nomor kartu member: MBR-YYYYMMDD-001
   */
  static async generateMemberNo(dbInstance?: any): Promise<string> {
    const db = dbInstance ?? (await getDatabase());
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const datePrefix = `MBR-${y}${m}${d}`;

    const lowerBound = `${datePrefix}-`;
    const upperBound = `${datePrefix}.`;

    const countRow = (await db.getFirstAsync(
      `SELECT COUNT(*) AS total
       FROM member_subscriptions
       WHERE member_no >= ? AND member_no < ?`,
      lowerBound,
      upperBound,
    )) as { total: number } | null;
    const seq = (countRow?.total ?? 0) + 1;
    return `${datePrefix}-${String(seq).padStart(3, "0")}`;
  }
}
