import { getDatabase } from "./index";
import { seedServices } from "./schema";

export async function seedDatabase() {
  const db = await getDatabase();

  // 1. Gabungkan referensi order_items ke layanan utama
  // sebelum menghapus layanan duplikat.
  await db.execAsync(`
    UPDATE order_items
    SET service_id = (
      SELECT MIN(s2.id)
      FROM services s1
      JOIN services s2
        ON LOWER(TRIM(s1.name)) = LOWER(TRIM(s2.name))
      WHERE s1.id = order_items.service_id
    )
    WHERE service_id IS NOT NULL;

    -- 2. Hapus layanan duplikat, sisakan ID paling kecil.
    DELETE FROM services
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM services
      GROUP BY LOWER(TRIM(name))
    );

    -- 3. Cegah duplikasi layanan selanjutnya.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name_unique
    ON services(LOWER(TRIM(name)));
  `);

  // 4. Seeder kategori kas.
  await db.execAsync(`
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

  // 5. Seeder layanan laundry price list Laundrify v2
  const serviceCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM services WHERE package_type IS NOT NULL`,
  );

  if ((serviceCount?.count ?? 0) === 0) {
    await seedServices(db);
  }
}
