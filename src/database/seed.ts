import type { SQLiteDatabase } from "expo-sqlite";
import { getDatabase, runExclusiveTransaction } from "./index";
import { seedServices } from "./schema";

/**
 * Jalankan seeding awal / pemulihan duplikat layanan (dipanggil dari migrasi versioned,
 * bukan di setiap cold start).
 */
export async function seedDatabase(
  dbInstance?: SQLiteDatabase,
  dedupeLegacyServices = false,
) {
  const db = dbInstance ?? (await getDatabase());

  await runExclusiveTransaction(db, async (tx) => {
    if (dedupeLegacyServices) {
      await tx.execAsync(`
        UPDATE order_items
        SET service_id = (
          SELECT MIN(s2.id)
          FROM services s1
          JOIN services s2
            ON LOWER(TRIM(s1.name)) = LOWER(TRIM(s2.name))
          WHERE s1.id = order_items.service_id
        )
        WHERE service_id IS NOT NULL;

        DELETE FROM services
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM services
          GROUP BY LOWER(TRIM(name))
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name_unique
        ON services(LOWER(TRIM(name)));
      `);
    }

    await tx.execAsync(`
      INSERT OR IGNORE INTO cash_categories (name, type)
      VALUES
        ('Pembayaran Laundry', 'income'),
        ('Pendapatan Lainnya', 'income'),
        ('Pembelian Deterjen', 'expense'),
        ('Pembelian Pewangi', 'expense'),
        ('Listrik', 'expense'),
        ('Air', 'expense'),
        ('Gaji Karyawan', 'expense'),
        ('Operasional', 'expense'),
        ('Pengeluaran Lainnya', 'expense'),
        ('Pengembalian Pembayaran', 'expense');
    `);

    const serviceCount = await tx.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM services WHERE package_type IS NOT NULL`,
    );

    if ((serviceCount?.count ?? 0) === 0) {
      await seedServices(tx);
    }
  });
}
