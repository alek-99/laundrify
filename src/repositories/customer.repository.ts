import { getDatabase } from "../database";
import type { Customer } from "../types/database";

export interface CustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function createCustomer(input: CustomerInput) {
  const db = await getDatabase();

  const name = input.name.trim();

  if (!name) {
    throw new Error("Nama pelanggan wajib diisi");
  }

  const result = await db.runAsync(
    `INSERT INTO customers (name, phone, address, notes)
     VALUES (?, ?, ?, ?)`,
    name,
    input.phone?.trim() || null,
    input.address?.trim() || null,
    input.notes?.trim() || null,
  );

  return getCustomerById(result.lastInsertRowId);
}

export async function getCustomerById(id: number) {
  const db = await getDatabase();

  return db.getFirstAsync<Customer>(
    `SELECT *
     FROM customers
     WHERE id = ? AND deleted_at IS NULL`,
    id,
  );
}

/**
 * Cari pelanggan berdasarkan nomor telepon atau nama persis.
 * Jika belum ada, otomatis simpan ke tabel customers (Laundrify v2).
 */
export async function findOrCreateCustomer(
  name: string,
  phone?: string | null,
  dbInstance?: any,
): Promise<Customer> {
  const db = dbInstance ?? (await getDatabase());
  const trimmedName = name.trim();
  const trimmedPhone = phone?.trim() || null;

  if (!trimmedName) {
    throw new Error("Nama pelanggan wajib diisi");
  }

  // 1. Cari berdasarkan no HP jika ada
  if (trimmedPhone) {
    const existingByPhone = await db.getFirstAsync(
      `SELECT * FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1`,
      trimmedPhone,
    );
    if (existingByPhone) return existingByPhone as Customer;
  }

  // 2. Cari berdasarkan nama persis
  const existingByName = await db.getFirstAsync(
    `SELECT * FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL LIMIT 1`,
    trimmedName,
  );
  if (existingByName) return existingByName as Customer;

  // 3. Buat baru jika belum ada
  const result = await db.runAsync(
    `INSERT INTO customers (name, phone) VALUES (?, ?)`,
    trimmedName,
    trimmedPhone,
  );

  const created = await db.getFirstAsync(
    `SELECT * FROM customers WHERE id = ?`,
    result.lastInsertRowId,
  );
  return created as Customer;
}

/** Escape karakter wildcard LIKE (% _ \\) agar input user dicari apa adanya. */
function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Bangun klausa WHERE. Tanpa kata kunci, tidak ada LIKE sama sekali
 * sehingga SQLite cukup memakai partial index (idx_customers_active_id).
 */
function buildCustomerFilter(search: string) {
  if (!search) {
    return { where: "deleted_at IS NULL", params: [] as string[] };
  }

  const contains = `%${escapeLike(search)}%`;

  return {
    where: `deleted_at IS NULL
       AND (name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\')`,
    params: [contains, contains],
  };
}

export async function getCustomers(options?: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDatabase();

  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const search = options?.search?.trim() ?? "";
  const filter = buildCustomerFilter(search);

  return db.getAllAsync<Customer>(
    `SELECT *
     FROM customers
     WHERE ${filter.where}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    ...filter.params,
    limit,
    offset,
  );
}

export interface CustomerPage {
  rows: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Pencarian pelanggan berhalaman untuk pemilih di form order.
 * - Hanya mengambil `pageSize` baris (default 5), bukan seluruh tabel.
 * - Dengan kata kunci: nama yang diawali kata kunci tampil lebih dulu,
 *   lalu urut nama A-Z; tanpa kata kunci: pelanggan terbaru dulu.
 * - Halaman di luar jangkauan (mis. data terhapus) otomatis dikoreksi.
 */
export async function searchCustomers(options?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<CustomerPage> {
  const db = await getDatabase();

  const pageSize = Math.min(Math.max(options?.pageSize ?? 5, 1), 50);
  const search = (options?.search ?? "").replace(/\s+/g, " ").trim();
  const filter = buildCustomerFilter(search);

  const countRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM customers WHERE ${filter.where}`,
    ...filter.params,
  );

  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(options?.page ?? 0, 0), totalPages - 1);
  const offset = page * pageSize;

  const rows = search
    ? await db.getAllAsync<Customer>(
        `SELECT *
         FROM customers
         WHERE ${filter.where}
         ORDER BY
           CASE WHEN name LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END,
           name COLLATE NOCASE ASC,
           id DESC
         LIMIT ? OFFSET ?`,
        ...filter.params,
        `${escapeLike(search)}%`,
        pageSize,
        offset,
      )
    : await db.getAllAsync<Customer>(
        `SELECT *
         FROM customers
         WHERE ${filter.where}
         ORDER BY id DESC
         LIMIT ? OFFSET ?`,
        pageSize,
        offset,
      );

  return { rows, total, page, pageSize, totalPages };
}

export async function updateCustomer(id: number, input: CustomerInput) {
  const db = await getDatabase();

  if (!input.name.trim()) {
    throw new Error("Nama pelanggan wajib diisi");
  }

  const result = await db.runAsync(
    `UPDATE customers
     SET name = ?,
         phone = ?,
         address = ?,
         notes = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`,
    input.name.trim(),
    input.phone?.trim() || null,
    input.address?.trim() || null,
    input.notes?.trim() || null,
    id,
  );

  if (result.changes === 0) {
    throw new Error("Pelanggan tidak ditemukan");
  }

  return getCustomerById(id);
}

export async function deleteCustomer(id: number) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE customers
     SET deleted_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND deleted_at IS NULL`,
    id,
  );

  if (result.changes === 0) {
    throw new Error("Pelanggan tidak ditemukan");
  }

  return true;
}

export async function countCustomers() {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM customers
     WHERE deleted_at IS NULL`,
  );

  return result?.total ?? 0;
}
