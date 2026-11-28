// src/database/schema.ts  — Laundrify v2 (SQLite / expo-sqlite)
// Status order : received | processing | ready | completed
//                (diterima | diproses | siap diambil | selesai)

export const SCHEMA_INDEXES_AND_TRIGGERS_SQL = `
  -- Customers
  CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_customers_active_id
    ON customers(id DESC) WHERE deleted_at IS NULL;

  -- Services
  CREATE UNIQUE INDEX IF NOT EXISTS idx_services_name_unique
    ON services(LOWER(TRIM(name)));
  CREATE INDEX IF NOT EXISTS idx_services_category
    ON services(category, sort_order);

  -- Orders (partial indexes untuk query aktif & sorting terbaru)
  CREATE INDEX IF NOT EXISTS idx_orders_customer
    ON orders(customer_id, order_date DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_active_date
    ON orders(order_date DESC, id DESC) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_orders_active_status_date
    ON orders(status, order_date DESC, id DESC) WHERE deleted_at IS NULL;
  CREATE INDEX IF NOT EXISTS idx_orders_order_date
    ON orders(order_date);
  CREATE INDEX IF NOT EXISTS idx_orders_payment
    ON orders(payment_status);

  -- Order Items & Status History
  CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_service
    ON order_items(service_id);
  CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created
    ON order_status_history(order_id, created_at);

  -- Member Subscriptions & Usages
  CREATE INDEX IF NOT EXISTS idx_subs_customer
    ON member_subscriptions(customer_id, status);
  CREATE INDEX IF NOT EXISTS idx_member_subscriptions_purchase_order
    ON member_subscriptions(purchase_order_id);
  CREATE INDEX IF NOT EXISTS idx_usages_sub
    ON member_usages(subscription_id, is_void, used_at);
  CREATE INDEX IF NOT EXISTS idx_member_usages_order
    ON member_usages(order_id);

  -- Payments & Cash Transactions
  CREATE INDEX IF NOT EXISTS idx_payments_order
    ON payments(order_id, is_void);
  CREATE INDEX IF NOT EXISTS idx_payments_active_date
    ON payments(is_void, payment_date);
  CREATE INDEX IF NOT EXISTS idx_cash_date
    ON cash_transactions(transaction_date DESC);
  CREATE INDEX IF NOT EXISTS idx_cash_active_date
    ON cash_transactions(transaction_date DESC, id DESC) WHERE is_void = 0;
  CREATE INDEX IF NOT EXISTS idx_cash_active_dir_date
    ON cash_transactions(direction, transaction_date DESC, id DESC) WHERE is_void = 0;
  CREATE INDEX IF NOT EXISTS idx_cash_category
    ON cash_transactions(category_id);

  -- Print & WhatsApp Logs (mendukung FK cascades & detail order)
  CREATE INDEX IF NOT EXISTS idx_print_logs_order
    ON print_logs(order_id);
  CREATE INDEX IF NOT EXISTS idx_print_logs_subscription
    ON print_logs(subscription_id);
  CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_order
    ON whatsapp_logs(order_id);
  CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_customer
    ON whatsapp_logs(customer_id);

  -- Triggers untuk menjaga orders.paid_amount & orders.payment_status selalu sinkron dengan payments
  CREATE TRIGGER IF NOT EXISTS trg_payments_after_insert
  AFTER INSERT ON payments
  BEGIN
    UPDATE orders
    SET paid_amount = COALESCE((
      SELECT SUM(amount)
      FROM payments
      WHERE order_id = NEW.order_id AND is_void = 0
    ), 0),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.order_id;

    UPDATE orders
    SET payment_status = CASE
      WHEN paid_amount >= total THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = NEW.order_id;
  END;

  CREATE TRIGGER IF NOT EXISTS trg_payments_after_update
  AFTER UPDATE OF amount, is_void, order_id ON payments
  BEGIN
    UPDATE orders
    SET paid_amount = COALESCE((
      SELECT SUM(amount)
      FROM payments
      WHERE order_id = NEW.order_id AND is_void = 0
    ), 0),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.order_id;

    UPDATE orders
    SET payment_status = CASE
      WHEN paid_amount >= total THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = NEW.order_id;
  END;

  CREATE TRIGGER IF NOT EXISTS trg_payments_after_delete
  AFTER DELETE ON payments
  BEGIN
    UPDATE orders
    SET paid_amount = COALESCE((
      SELECT SUM(amount)
      FROM payments
      WHERE order_id = OLD.order_id AND is_void = 0
    ), 0),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.order_id;

    UPDATE orders
    SET payment_status = CASE
      WHEN paid_amount >= total THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE 'unpaid'
    END
    WHERE id = OLD.order_id;
  END;
`;

export const DATABASE_SCHEMA = `
  -- ============ PELANGGAN ============
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
  );

  -- ============ LAYANAN (price list) ============
  -- category    : kiloan | satuan | karpet
  -- package_type: CKS | CKL | ST  (hanya layanan kiloan; dipakai untuk mencocokkan kuota paket)
  -- unit        : kg | pcs | mtr | m2
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'kiloan'
      CHECK(category IN ('kiloan','satuan','karpet')),
    package_type TEXT CHECK(package_type IN ('CKS','CKL','ST') OR package_type IS NULL),
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'kg',
    price INTEGER NOT NULL CHECK(price >= 0),
    estimated_hours INTEGER NOT NULL DEFAULT 72,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- ============ MASTER PAKET MEMBER (price list paket member) ============
  CREATE TABLE IF NOT EXISTS member_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,                       -- CKS-100, CKL-50, ...
    name TEXT NOT NULL,                              -- "Cuci Kering Setrika 100 KG"
    package_type TEXT NOT NULL CHECK(package_type IN ('CKS','CKL','ST')),
    quota_kg INTEGER NOT NULL CHECK(quota_kg > 0),
    price INTEGER NOT NULL CHECK(price >= 0),
    free_pickup_delivery INTEGER NOT NULL DEFAULT 1,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- ============ PESANAN ============
  CREATE TABLE IF NOT EXISTS orders (
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
    subtotal INTEGER NOT NULL DEFAULT 0,             -- nilai semua item
    member_discount INTEGER NOT NULL DEFAULT 0,      -- item yang ditanggung kuota paket
    discount INTEGER NOT NULL DEFAULT 0,             -- diskon manual
    total INTEGER NOT NULL DEFAULT 0,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CHECK(member_discount >= 0 AND discount >= 0),
    CHECK(member_discount + discount <= subtotal),
    CHECK(total = subtotal - member_discount - discount),
    CHECK(customer_id IS NOT NULL OR LENGTH(TRIM(COALESCE(customer_name, ''))) > 0)
  );

  -- item_type = 'service' (layanan biasa) atau 'package' (membeli paket member)
  -- paid_by_subscription_id terisi bila item ini dipotong dari kuota paket (harga ditanggung member)
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'service' CHECK(item_type IN ('service','package')),
    service_id INTEGER,
    package_id INTEGER,
    service_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity REAL NOT NULL CHECK(quantity > 0),
    price INTEGER NOT NULL CHECK(price >= 0),
    subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
    paid_by_subscription_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY(package_id) REFERENCES member_packages(id) ON DELETE SET NULL,
    FOREIGN KEY(paid_by_subscription_id) REFERENCES member_subscriptions(id) ON DELETE SET NULL,
    CHECK(item_type = 'service' OR package_id IS NOT NULL)
  );

  CREATE TABLE IF NOT EXISTS order_status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  -- ============ MEMBER / LANGGANAN ============
  CREATE TABLE IF NOT EXISTS member_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_no TEXT NOT NULL UNIQUE,                  -- MBR-YYYYMMDD-001
    customer_id INTEGER NOT NULL,
    package_id INTEGER,
    package_name TEXT NOT NULL,                      -- snapshot (tipe paket di kartu)
    package_type TEXT NOT NULL CHECK(package_type IN ('CKS','CKL','ST')),
    quota_kg INTEGER NOT NULL CHECK(quota_kg > 0),
    price_paid INTEGER NOT NULL CHECK(price_paid >= 0),
    start_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- "Tgl Berlaku" di kartu
    expired_at TEXT,                                 -- NULL = tanpa batas masa berlaku
    purchase_order_id INTEGER,                       -- order tempat paket dibeli
    status TEXT NOT NULL DEFAULT 'active'
      CHECK(status IN ('active','used_up','cancelled')),
    card_printed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY(package_id) REFERENCES member_packages(id) ON DELETE SET NULL,
    FOREIGN KEY(purchase_order_id) REFERENCES orders(id) ON DELETE SET NULL
  );

  -- Satu baris = satu kotak di kartu (maks 15 kotak per kartu).
  -- slot_no 1..15 = nomor kotak; card_page = ((urutan-1)/15)+1 (hitung di aplikasi).
  CREATE TABLE IF NOT EXISTS member_usages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER NOT NULL,
    order_id INTEGER NOT NULL,
    order_item_id INTEGER,
    kg_used REAL NOT NULL CHECK(kg_used > 0),
    used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_void INTEGER NOT NULL DEFAULT 0 CHECK(is_void IN (0,1)),
    FOREIGN KEY(subscription_id) REFERENCES member_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(order_item_id) REFERENCES order_items(id) ON DELETE SET NULL
  );

  -- Saldo kuota dihitung dari log (tidak disimpan ganda, jadi selalu konsisten)
  CREATE VIEW IF NOT EXISTS v_subscription_balance AS
    SELECT s.*,
           COALESCE(SUM(CASE WHEN u.is_void = 0 THEN u.kg_used END), 0) AS used_kg,
           s.quota_kg - COALESCE(SUM(CASE WHEN u.is_void = 0 THEN u.kg_used END), 0) AS remaining_kg
    FROM member_subscriptions s
    LEFT JOIN member_usages u ON u.subscription_id = s.id
    GROUP BY s.id;

  -- ============ PEMBAYARAN & KAS ============
  CREATE TABLE IF NOT EXISTS cash_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    method TEXT NOT NULL,                            -- cash | transfer | qris
    payment_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference_number TEXT,
    notes TEXT,
    is_void INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS cash_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    payment_id INTEGER UNIQUE,
    direction TEXT NOT NULL CHECK(direction IN ('income', 'expense')),
    amount INTEGER NOT NULL CHECK(amount > 0),
    description TEXT NOT NULL,
    transaction_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_void INTEGER NOT NULL DEFAULT 0 CHECK(is_void IN (0,1)),
    FOREIGN KEY(category_id) REFERENCES cash_categories(id) ON DELETE RESTRICT,
    FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE RESTRICT
  );

  -- ============ CETAK & WHATSAPP ============
  -- Log cetak: struk, label, kartu member
  CREATE TABLE IF NOT EXISTS print_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    print_type TEXT NOT NULL CHECK(print_type IN ('receipt','label','member_card')),
    order_id INTEGER,
    subscription_id INTEGER,
    copies INTEGER NOT NULL DEFAULT 1 CHECK(copies > 0),
    printed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(subscription_id) REFERENCES member_subscriptions(id) ON DELETE CASCADE
  );

  -- Log pesan WhatsApp (invoice otomatis & pesan manual)
  CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    customer_id INTEGER,
    phone TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'invoice' CHECK(message_type IN ('invoice','info')),
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE SET NULL
  );

  -- ============ PENGATURAN ============
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('laundry_name', 'Premium Laundry Service'),
    ('laundry_address', ''),
    ('laundry_phone', ''),
    ('bank_name', ''),
    ('bank_account_number', ''),
    ('bank_account_holder', ''),
    ('invoice_footer', 'Terima kasih sudah mencuci di tempat kami.');

  INSERT OR IGNORE INTO member_packages (code, name, package_type, quota_kg, price) VALUES
    ('CKS-100', 'Cuci Kering Setrika 100 KG', 'CKS', 100, 700000),
    ('CKS-50',  'Cuci Kering Setrika 50 KG',  'CKS', 50,  375000),
    ('CKL-100', 'Cuci Kering Lipat 100 KG',   'CKL', 100, 500000),
    ('CKL-50',  'Cuci Kering Lipat 50 KG',    'CKL', 50,  275000),
    ('ST-100',  'Setrika Only 100 KG',        'ST',  100, 500000),
    ('ST-50',   'Setrika Only 50 KG',         'ST',  50,  275000);

  ${SCHEMA_INDEXES_AND_TRIGGERS_SQL}
`;

// ======================================================================
// SEED LAYANAN — sesuai price list (harga dalam rupiah)
// ======================================================================
export type ServiceSeed = {
  name: string;
  category: 'kiloan' | 'satuan' | 'karpet';
  package_type: 'CKS' | 'CKL' | 'ST' | null;
  unit: 'kg' | 'pcs' | 'mtr' | 'm2';
  price: number;
  estimated_hours: number;
};

// --- Kiloan: [kode, nama, [5 Jam, 1 Hari, 2 Hari, 3 Hari]]
const KILOAN: ['CKS' | 'CKL' | 'ST', string, number[]][] = [
  ['CKS', 'Cuci Kering Setrika', [20000, 12000, 10000, 8000]],
  ['CKL', 'Cuci Kering Lipat', [15000, 10000, 8000, 6000]],
  ['ST', 'Setrika Only', [15000, 10000, 8000, 6000]],
];
const SPEEDS: [string, number][] = [['5 Jam', 5], ['1 Hari', 24], ['2 Hari', 48], ['3 Hari', 72]];

// --- Satuan: [nama, harga, unit]
const SATUAN: [string, number, ServiceSeed['unit']][] = [
  // kolom 1
  ['Bedcover Single', 25000, 'pcs'], ['Bedcover Queen', 30000, 'pcs'],
  ['Bedcover King', 35000, 'pcs'], ['Bedcover Jumbo', 45000, 'pcs'],
  ['Sprei + SB + SQ', 20000, 'pcs'], ['Selimut Single', 15000, 'pcs'],
  ['Selimut Queen', 20000, 'pcs'], ['Selimut King', 25000, 'pcs'],
  ['Bantal', 25000, 'pcs'], ['Guling', 25000, 'pcs'], ['Bantal Sofa', 15000, 'pcs'],
  ['Kemeja', 20000, 'pcs'], ['Kaos', 15000, 'pcs'], ['Celana', 20000, 'pcs'],
  ['Rompi', 20000, 'pcs'], ['Jaket Standart', 25000, 'pcs'], ['Sweter', 25000, 'pcs'],
  ['Kerudung', 10000, 'pcs'], ['Stroler', 85000, 'pcs'], ['Tas Kulit', 35000, 'pcs'],
  ['Toga', 45000, 'pcs'],
  // kolom 2
  ['Stelan Jas', 75000, 'pcs'], ['Jas Only', 35000, 'pcs'], ['Koper', 65000, 'pcs'],
  ['Gorden', 25000, 'kg'], ['Dress Pendek', 25000, 'pcs'], ['Dress Panjang', 35000, 'pcs'],
  ['Gamis Dewasa', 35000, 'pcs'], ['Gamis Anak', 25000, 'pcs'], ['Stelan Dinas', 45000, 'pcs'],
  ['Jaket Kulit', 35000, 'pcs'], ['Jaket Winter Panjang', 45000, 'pcs'],
  ['Jaket Winter Standart', 30000, 'pcs'], ['Jaket Winter Anak', 25000, 'pcs'],
  ['Kasur Bayi', 35000, 'pcs'], ['Pet Bed (Kucing / Anjing)', 35000, 'pcs'],
  ['Sofa Bed Bayi', 30000, 'pcs'], ['Boneka M', 20000, 'pcs'], ['Boneka L', 30000, 'pcs'],
  ['Boneka XL', 45000, 'pcs'], ['Tas Standart', 25000, 'pcs'], ['Gaun', 75000, 'pcs'],
  // kolom 3
  ['Karpet Permadani (per meter)', 30000, 'mtr'], ['Karpet Masjid (per meter)', 20000, 'mtr'],
  ['Karpet Kain / Bulu (per meter)', 25000, 'mtr'],
  ['Atasan Dinas', 25000, 'pcs'], ['Cuci + Treatment Kemeja', 35000, 'pcs'],
  ['Setelan Jas (Jas + Celana)', 40000, 'pcs'], ['Sepatu Dewasa', 45000, 'pcs'],
  ['Sepatu Anak', 35000, 'pcs'], ['Sepatu Boots', 75000, 'pcs'], ['Kebaya', 20000, 'pcs'],
  ['Rok Kebaya', 15000, 'pcs'], ['Treatment Noda', 20000, 'pcs'],
  ['Treatment Handuk', 30000, 'pcs'], ['Helm Standart', 50000, 'pcs'],
  ['Helm Full Face', 75000, 'pcs'], ['Helm Anak', 40000, 'pcs'], ['Sepatu', 15000, 'pcs'],
  ['Mukena / Set', 20000, 'pcs'], ['Topi', 15000, 'pcs'], ['Tas Ransel', 45000, 'pcs'],
  ['Keset', 15000, 'pcs'],
];

// --- Cuci karpet per m²: [nama, [Tipis, Sedang, Tebal, Super Tebal]]
const KARPET: [string, number[]][] = [
  ['Permadani', [15000, 25000, 30000, 45000]],
  ['Bulu', [25000, 30000, 45000, 60000]],
  ['Masjid', [15000, 20000, 25000, 30000]],
  ['Kantor', [20000, 30000, 45000, 60000]],
  ['Kain', [15000, 25000, 30000, 40000]],
  ['Sutera / Wol', [30000, 40000, 55000, 70000]],
];
const KARPET_LEVEL = ['Tipis', 'Sedang', 'Tebal', 'Super Tebal'];

export function buildServiceSeed(): ServiceSeed[] {
  const out: ServiceSeed[] = [];
  for (const [code, label, prices] of KILOAN) {
    SPEEDS.forEach(([speed, hours], i) =>
      out.push({
        name: `${label} (${code}) - ${speed}`,
        category: 'kiloan', package_type: code, unit: 'kg',
        price: prices[i], estimated_hours: hours,
      }));
  }
  for (const [name, price, unit] of SATUAN)
    out.push({ name, category: 'satuan', package_type: null, unit, price, estimated_hours: 72 });
  for (const [name, prices] of KARPET)
    KARPET_LEVEL.forEach((lvl, i) =>
      out.push({
        name: `Cuci Karpet ${name} - ${lvl}`,
        category: 'karpet', package_type: null, unit: 'm2',
        price: prices[i], estimated_hours: 72,
      }));
  return out;
}

type SeedDb = { runAsync: (sql: string, ...params: any[]) => Promise<any> };

export async function seedServices(db: SeedDb) {
  const rows = buildServiceSeed();
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
    await db.runAsync(
      `INSERT OR IGNORE INTO services
        (name, category, package_type, unit, price, estimated_hours, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.name, s.category, s.package_type, s.unit, s.price, s.estimated_hours, i],
    );
  }
}
