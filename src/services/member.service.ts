import { getDatabase } from "../database";
import type {
  MemberPackage,
  MemberSubscriptionWithBalance,
  MemberUsage,
  PackageType,
} from "../types/database";

export class MemberService {
  /**
   * Ambil daftar paket member aktif
   *//**
 * Ambil seluruh daftar membership beserta saldo kuota.
 * Bisa digunakan untuk halaman pengelolaan member.
 */
static async getAllSubscriptions(search = "") {
  const db = await getDatabase();
  const keyword = search.trim();

  return db.getAllAsync<
    MemberSubscriptionWithBalance & {
      customer_name: string;
      customer_phone: string | null;
    }
  >(
    `SELECT
       v.*,
       c.name AS customer_name,
       c.phone AS customer_phone
     FROM v_subscription_balance v
     INNER JOIN customers c ON c.id = v.customer_id
     WHERE
       (? = ''
        OR c.name LIKE '%' || ? || '%' COLLATE NOCASE
        OR v.member_no LIKE '%' || ? || '%' COLLATE NOCASE
        OR v.package_name LIKE '%' || ? || '%' COLLATE NOCASE)
     ORDER BY
       CASE v.status
         WHEN 'active' THEN 1
         WHEN 'used_up' THEN 2
         ELSE 3
       END,
       v.created_at DESC`,
    keyword,
    keyword,
    keyword,
    keyword,
  );
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

    const countRow = (await db.getFirstAsync(
      `SELECT COUNT(*) AS total FROM member_subscriptions WHERE member_no LIKE ?`,
      `${datePrefix}%`,
    )) as { total: number } | null;
    const seq = (countRow?.total ?? 0) + 1;
    return `${datePrefix}-${String(seq).padStart(3, "0")}`;
  }
}
