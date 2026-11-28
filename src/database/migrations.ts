import type { SQLiteDatabase } from "expo-sqlite";
import { getDatabase, runExclusiveTransaction } from "./index";
import { DATABASE_SCHEMA, SCHEMA_INDEXES_AND_TRIGGERS_SQL } from "./schema";
import { seedDatabase } from "./seed";

export const CURRENT_DATABASE_VERSION = 4;

type TableInfoRow = { name: string; notnull: number };

const ORDERS_COLUMNS_V1 = `
  id, order_number, customer_id, order_date, estimated_completion,
  status, subtotal, discount, total, notes,
  created_at, updated_at, deleted_at
`;

async function countRows(db: SQLiteDatabase, table: string) {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM ${table}`,
  );
  return row?.total ?? 0;
}

/**
 * v2: order boleh tanpa pelanggan terdaftar (nama & nomor WhatsApp diisi
 * langsung di form order).
 */
async function migrateOrdersCustomerOptional(db: SQLiteDatabase) {
  const columns = await db.getAllAsync<TableInfoRow>(
    `PRAGMA table_info(orders)`,
  );

  if (!columns.length) return;

  const customerId = columns.find((c) => c.name === "customer_id");
  const hasName = columns.some((c) => c.name === "customer_name");
  const hasPhone = columns.some((c) => c.name === "customer_phone");
  const needsRebuild = customerId?.notnull === 1;

  if (!needsRebuild && hasName && hasPhone) return;

  if (!needsRebuild) {
    if (!hasName) await db.execAsync(`ALTER TABLE orders ADD COLUMN customer_name TEXT`);
    if (!hasPhone) await db.execAsync(`ALTER TABLE orders ADD COLUMN customer_phone TEXT`);
    return;
  }

  await db.execAsync(`PRAGMA foreign_keys = OFF;`);

  try {
    const fk = await db.getFirstAsync<{ foreign_keys: number }>(
      `PRAGMA foreign_keys`,
    );

    if (fk?.foreign_keys !== 0) {
      throw new Error("Migrasi dibatalkan: foreign key tidak bisa dimatikan.");
    }

    await db.execAsync(`BEGIN IMMEDIATE;`);

    try {
      const before = {
        orders: await countRows(db, "orders"),
        items: await countRows(db, "order_items"),
        payments: await countRows(db, "payments"),
        history: await countRows(db, "order_status_history"),
      };

      await db.execAsync(`
        DROP TABLE IF EXISTS orders_new;

        CREATE TABLE orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_number TEXT NOT NULL UNIQUE,
          customer_id INTEGER,
          customer_name TEXT,
          customer_phone TEXT,
          order_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          estimated_completion TEXT,
          completed_at TEXT,
          status TEXT NOT NULL DEFAULT 'received'
            CHECK(status IN ('received','processing','ready','completed')),
          payment_status TEXT NOT NULL DEFAULT 'unpaid'
            CHECK(payment_status IN ('unpaid','partial','paid')),
          subtotal INTEGER NOT NULL DEFAULT 0,
          member_discount INTEGER NOT NULL DEFAULT 0,
          discount INTEGER NOT NULL DEFAULT 0,
          total INTEGER NOT NULL DEFAULT 0,
          paid_amount INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          deleted_at TEXT,
          FOREIGN KEY(customer_id)
            REFERENCES customers(id)
            ON DELETE RESTRICT,
          CHECK(discount <= subtotal),
          CHECK(customer_id IS NOT NULL OR LENGTH(TRIM(COALESCE(customer_name, ''))) > 0)
        );

        INSERT INTO orders_new (
          id, order_number, customer_id, order_date, estimated_completion,
          status, subtotal, discount, total, notes,
          created_at, updated_at, deleted_at
        )
        SELECT ${ORDERS_COLUMNS_V1} FROM orders;

        UPDATE sqlite_sequence
        SET seq = MAX(
          seq,
          COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'orders'), 0)
        )
        WHERE name = 'orders_new';

        DROP TABLE orders;
        ALTER TABLE orders_new RENAME TO orders;

        CREATE INDEX IF NOT EXISTS idx_orders_customer
        ON orders(customer_id, order_date DESC);

        CREATE INDEX IF NOT EXISTS idx_orders_status
        ON orders(status, order_date DESC);
      `);

      const after = {
        orders: await countRows(db, "orders"),
        items: await countRows(db, "order_items"),
        payments: await countRows(db, "payments"),
        history: await countRows(db, "order_status_history"),
      };

      if (JSON.stringify(before) !== JSON.stringify(after)) {
        throw new Error(
          `Migrasi dibatalkan: jumlah data berubah (${JSON.stringify(before)} -> ${JSON.stringify(after)}).`,
        );
      }

      await db.execAsync(`COMMIT;`);
    } catch (error) {
      try {
        await db.execAsync(`ROLLBACK;`);
      } catch {}
      throw error;
    }
  } finally {
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
  }
}

/**
 * v3: Pastikan semua kolom skema Laundrify v2 tersedia di orders, order_items, dan services.
 */
async function ensureSchemaV2(db: SQLiteDatabase) {
  // 1. Orders
  const orderCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(orders)`,
  );
  const orderColSet = new Set(orderCols.map((c) => c.name));

  if (!orderColSet.has("member_discount")) {
    await db.execAsync(
      `ALTER TABLE orders ADD COLUMN member_discount INTEGER NOT NULL DEFAULT 0`,
    );
  }
  if (!orderColSet.has("paid_amount")) {
    await db.execAsync(
      `ALTER TABLE orders ADD COLUMN paid_amount INTEGER NOT NULL DEFAULT 0`,
    );
  }
  if (!orderColSet.has("payment_status")) {
    await db.execAsync(
      `ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'`,
    );
  }
  if (!orderColSet.has("completed_at")) {
    await db.execAsync(
      `ALTER TABLE orders ADD COLUMN completed_at TEXT`,
    );
  }

  // 2. Order Items
  const itemCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(order_items)`,
  );
  const itemColSet = new Set(itemCols.map((c) => c.name));

  if (!itemColSet.has("item_type")) {
    await db.execAsync(
      `ALTER TABLE order_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'service'`,
    );
  }
  if (!itemColSet.has("package_id")) {
    await db.execAsync(
      `ALTER TABLE order_items ADD COLUMN package_id INTEGER`,
    );
  }
  if (!itemColSet.has("paid_by_subscription_id")) {
    await db.execAsync(
      `ALTER TABLE order_items ADD COLUMN paid_by_subscription_id INTEGER`,
    );
  }

  // 3. Services
  const svcCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(services)`,
  );
  const svcColSet = new Set(svcCols.map((c) => c.name));

  if (!svcColSet.has("category")) {
    await db.execAsync(
      `ALTER TABLE services ADD COLUMN category TEXT NOT NULL DEFAULT 'kiloan'`,
    );
  }
  if (!svcColSet.has("package_type")) {
    await db.execAsync(
      `ALTER TABLE services ADD COLUMN package_type TEXT`,
    );
  }
  if (!svcColSet.has("sort_order")) {
    await db.execAsync(
      `ALTER TABLE services ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
    );
  }

  // 4. Update paid_amount & payment_status jika ada order yang belum dihitung
  await db.execAsync(`
    UPDATE orders SET paid_amount = COALESCE((
      SELECT SUM(amount) FROM payments p WHERE p.order_id = orders.id AND p.is_void = 0
    ), 0) WHERE paid_amount = 0;

    UPDATE orders SET payment_status = CASE
      WHEN paid_amount <= 0 THEN 'unpaid'
      WHEN paid_amount >= total THEN 'paid'
      ELSE 'partial'
    END WHERE payment_status = 'unpaid' AND paid_amount > 0;
  `);
}

/**
 * v4: Sinkronisasi paid_amount/payment_status, normalisasi timestamp UTC SQLite,
 * migrasi key pengaturan business_* -> laundry_*, index tambahan & triggers.
 */
async function migrateToV4(db: SQLiteDatabase) {
  await runExclusiveTransaction(db, async (tx) => {
    await tx.execAsync(`
      DROP INDEX IF EXISTS idx_orders_status;
      ${SCHEMA_INDEXES_AND_TRIGGERS_SQL}

      UPDATE orders
      SET paid_amount = COALESCE((
        SELECT SUM(amount)
        FROM payments p
        WHERE p.order_id = orders.id AND p.is_void = 0
      ), 0);

      UPDATE orders
      SET payment_status = CASE
        WHEN paid_amount >= total THEN 'paid'
        WHEN paid_amount > 0 THEN 'partial'
        ELSE 'unpaid'
      END;

      UPDATE cash_transactions
      SET transaction_date = datetime(transaction_date)
      WHERE transaction_date LIKE '%T%'
        AND datetime(transaction_date) IS NOT NULL;

      UPDATE orders
      SET order_date = datetime(order_date)
      WHERE order_date LIKE '%T%'
        AND datetime(order_date) IS NOT NULL;

      UPDATE payments
      SET payment_date = datetime(payment_date)
      WHERE payment_date LIKE '%T%'
        AND datetime(payment_date) IS NOT NULL;

      UPDATE member_subscriptions
      SET start_date = datetime(start_date)
      WHERE start_date LIKE '%T%'
        AND datetime(start_date) IS NOT NULL;

      INSERT INTO app_settings (key, value, updated_at)
      SELECT 'laundry_name', TRIM(value), CURRENT_TIMESTAMP
      FROM app_settings
      WHERE key = 'business_name'
        AND TRIM(COALESCE(value, '')) != ''
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP;

      INSERT INTO app_settings (key, value, updated_at)
      SELECT 'laundry_phone', TRIM(value), CURRENT_TIMESTAMP
      FROM app_settings
      WHERE key = 'business_phone'
        AND TRIM(COALESCE(value, '')) != ''
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP;

      DELETE FROM app_settings
      WHERE key IN ('business_name', 'business_phone');
    `);
  });
}

async function runUpgrades(db: SQLiteDatabase, fromVersion: number) {
  if (fromVersion < 2) {
    await migrateOrdersCustomerOptional(db);
  }

  if (fromVersion < 3) {
    await ensureSchemaV2(db);
  }

  // Pastikan tabel & view terbaru tersedia sebelum seeding & migrasi v4.
  await db.execAsync(DATABASE_SCHEMA);

  if (fromVersion < 3) {
    await seedDatabase(db, true);
  } else if (fromVersion < 4) {
    // Pastikan kategori kas bawaan tetap lengkap jika database dibuat pada v3 awal.
    await seedDatabase(db, false);
  }

  if (fromVersion < 4) {
    await migrateToV4(db);
  }

  await db.runAsync(
    `INSERT INTO app_meta (key, value)
     VALUES ('database_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    String(CURRENT_DATABASE_VERSION),
  );

  await db.execAsync(`ANALYZE; PRAGMA optimize;`);
}

export async function initializeDatabase() {
  const db = await getDatabase();

  const metaTable = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'app_meta'`,
  );

  if (!metaTable) {
    await db.execAsync(DATABASE_SCHEMA);
    await seedDatabase(db, false);
    await db.runAsync(
      `INSERT INTO app_meta (key, value)
       VALUES ('database_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      String(CURRENT_DATABASE_VERSION),
    );
    await db.execAsync(`ANALYZE; PRAGMA optimize;`);
    return;
  }

  const versionRow = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = 'database_version'`,
  );
  const currentVersion = Number(versionRow?.value ?? 1);

  if (currentVersion >= CURRENT_DATABASE_VERSION) {
    return;
  }

  await runUpgrades(db, currentVersion);
}
