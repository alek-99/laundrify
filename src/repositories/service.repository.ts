
import { getDatabase } from "../database";
import type { Service, ServiceUnit } from "../types/database";

// ======================================================
// TYPES
// ======================================================

export type ServiceCategory = "kiloan" | "satuan" | "karpet";
export type PackageType = "CKS" | "CKL" | "ST";

export interface ServiceQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: ServiceCategory | "all";
  status?: "all" | "active" | "inactive";
}

export interface ServicePage {
  data: Service[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ServiceStatistics {
  total: number;
  active: number;
  inactive: number;
  kiloan: number;
  satuan: number;
  karpet: number;
}

export interface ServiceInput {
  name: string;
  category: ServiceCategory;
  package_type?: PackageType | null;
  description?: string | null;
  unit: ServiceUnit;
  price: number;
  estimated_hours?: number;
  sort_order?: number;
  is_active?: boolean;
}

// ======================================================
// CONSTANTS
// ======================================================

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "kiloan",
  "satuan",
  "karpet",
];

const PACKAGE_TYPES: PackageType[] = [
  "CKS",
  "CKL",
  "ST",
];

const SERVICE_UNITS: ServiceUnit[] = [
  "kg",
  "pcs",
  "mtr",
  "m2",
];

const DEFAULT_ESTIMATED_HOURS = 72;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

// ======================================================
// HELPERS
// ======================================================

function normalizePage(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE;

  return Math.max(1, Math.floor(value ?? DEFAULT_PAGE));
}

function normalizeLimit(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;

  return Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(value ?? DEFAULT_LIMIT))
  );
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function validateService(input: ServiceInput): void {
  const name = input.name?.trim();

  if (!name) {
    throw new Error("Nama layanan wajib diisi");
  }

  if (!SERVICE_CATEGORIES.includes(input.category)) {
    throw new Error("Kategori layanan tidak valid");
  }

  if (!SERVICE_UNITS.includes(input.unit)) {
    throw new Error("Satuan layanan tidak valid");
  }

  if (
    input.package_type !== undefined &&
    input.package_type !== null &&
    !PACKAGE_TYPES.includes(input.package_type)
  ) {
    throw new Error("Tipe paket tidak valid");
  }

  // Kiloan wajib menggunakan tipe paket.
  if (
    input.category === "kiloan" &&
    !input.package_type
  ) {
    throw new Error("Layanan kiloan wajib memiliki tipe paket");
  }

  // Satuan dan karpet tidak menggunakan tipe paket.
  if (
    input.category !== "kiloan" &&
    input.package_type != null
  ) {
    throw new Error(
      "Tipe paket hanya berlaku untuk layanan kiloan"
    );
  }

  // Validasi satuan berdasarkan kategori.
  if (
    input.category === "kiloan" &&
    input.unit !== "kg"
  ) {
    throw new Error("Layanan kiloan harus menggunakan satuan kg");
  }

  if (
    input.category === "karpet" &&
    input.unit !== "m2"
  ) {
    throw new Error("Layanan karpet harus menggunakan satuan m2");
  }

  if (
    !Number.isSafeInteger(input.price) ||
    input.price < 0
  ) {
    throw new Error("Harga layanan tidak valid");
  }

  if (
    input.estimated_hours !== undefined &&
    (
      !Number.isInteger(input.estimated_hours) ||
      input.estimated_hours < 0
    )
  ) {
    throw new Error("Estimasi waktu tidak valid");
  }

  if (
    input.sort_order !== undefined &&
    (
      !Number.isInteger(input.sort_order) ||
      input.sort_order < 0
    )
  ) {
    throw new Error("Urutan layanan tidak valid");
  }

  if (
    input.description !== undefined &&
    input.description !== null &&
    typeof input.description !== "string"
  ) {
    throw new Error("Deskripsi layanan tidak valid");
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (
      message.includes("unique constraint") ||
      message.includes("services.name")
    ) {
      return "Nama layanan sudah digunakan";
    }

    return error.message;
  }

  return "Terjadi kesalahan pada database";
}

// ======================================================
// GET SERVICE BY ID
// ======================================================

export async function getServiceById(
  id: number
): Promise<Service | null> {
  const db = await getDatabase();

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID layanan tidak valid");
  }

  return db.getFirstAsync<Service>(
    `SELECT *
     FROM services
     WHERE id = ?
     LIMIT 1`,
    id
  );
}

// ======================================================
// GET SERVICES PAGINATED
// ======================================================

export async function getServicesPaginated(
  query: ServiceQuery = {}
): Promise<ServicePage> {
  const db = await getDatabase();

  const requestedPage = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // Search
  const keyword = query.search?.trim();

  if (keyword) {
    const searchValue = `%${escapeLike(keyword)}%`;

    conditions.push(`
      (
        name LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR package_type LIKE ? ESCAPE '\\' COLLATE NOCASE
        OR description LIKE ? ESCAPE '\\' COLLATE NOCASE
      )
    `);

    params.push(
      searchValue,
      searchValue,
      searchValue
    );
  }

  // Category filter
  if (
    query.category &&
    query.category !== "all"
  ) {
    if (!SERVICE_CATEGORIES.includes(query.category)) {
      throw new Error("Filter kategori tidak valid");
    }

    conditions.push("category = ?");
    params.push(query.category);
  }

  // Status filter
  if (query.status === "active") {
    conditions.push("is_active = 1");
  } else if (query.status === "inactive") {
    conditions.push("is_active = 0");
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const runPageQuery = (offset: number) =>
    db.getAllAsync<Service & { total_count: number }>(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM services
       ${whereClause}
       ORDER BY
         sort_order ASC,
         name COLLATE NOCASE ASC,
         id ASC
       LIMIT ? OFFSET ?`,
      ...params,
      limit,
      offset,
    );

  let page = requestedPage;
  let rawRows = await runPageQuery((page - 1) * limit);

  let total = rawRows.length > 0 ? Number(rawRows[0].total_count) : 0;

  if (rawRows.length === 0 && requestedPage > 1) {
    const countResult = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) AS total FROM services ${whereClause}`,
      ...params,
    );
    total = countResult?.total ?? 0;
    const maxPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(requestedPage, maxPages);
    if (total > 0) {
      rawRows = await runPageQuery((page - 1) * limit);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const data: Service[] = rawRows.map(({ total_count: _totalCount, ...service }) => service);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ======================================================
// GET ALL SERVICES
// ======================================================

export async function getServices(
  activeOnly = true,
  category?: ServiceCategory
): Promise<Service[]> {
  const db = await getDatabase();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (activeOnly) {
    conditions.push("is_active = 1");
  }

  if (category) {
    if (!SERVICE_CATEGORIES.includes(category)) {
      throw new Error("Kategori layanan tidak valid");
    }

    conditions.push("category = ?");
    params.push(category);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  return db.getAllAsync<Service>(
    `SELECT *
     FROM services
     ${whereClause}
     ORDER BY
       sort_order ASC,
       name COLLATE NOCASE ASC,
       id ASC`,
    ...params
  );
}

// ======================================================
// SERVICE STATISTICS
// ======================================================

export async function getServiceStatistics(): Promise<ServiceStatistics> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<ServiceStatistics>(
    `SELECT
       COUNT(*) AS total,

       COALESCE(
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END),
         0
       ) AS active,

       COALESCE(
         SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END),
         0
       ) AS inactive,

       COALESCE(
         SUM(CASE WHEN category = 'kiloan' THEN 1 ELSE 0 END),
         0
       ) AS kiloan,

       COALESCE(
         SUM(CASE WHEN category = 'satuan' THEN 1 ELSE 0 END),
         0
       ) AS satuan,

       COALESCE(
         SUM(CASE WHEN category = 'karpet' THEN 1 ELSE 0 END),
         0
       ) AS karpet

     FROM services`
  );

  return {
    total: Number(result?.total ?? 0),
    active: Number(result?.active ?? 0),
    inactive: Number(result?.inactive ?? 0),
    kiloan: Number(result?.kiloan ?? 0),
    satuan: Number(result?.satuan ?? 0),
    karpet: Number(result?.karpet ?? 0),
  };
}

// ======================================================
// CREATE SERVICE
// ======================================================

export async function createService(
  input: ServiceInput
): Promise<Service | null> {
  const db = await getDatabase();

  validateService(input);

  try {
    const result = await db.runAsync(
      `INSERT INTO services (
        name,
        category,
        package_type,
        description,
        unit,
        price,
        estimated_hours,
        sort_order,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.name.trim(),
      input.category,
      input.package_type ?? null,
      input.description?.trim() || null,
      input.unit,
      input.price,
      input.estimated_hours ?? DEFAULT_ESTIMATED_HOURS,
      input.sort_order ?? 0,
      input.is_active === false ? 0 : 1
    );

    return getServiceById(result.lastInsertRowId);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

// ======================================================
// UPDATE SERVICE
// ======================================================

export async function updateService(
  id: number,
  input: ServiceInput
): Promise<Service | null> {
  const db = await getDatabase();

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID layanan tidak valid");
  }

  validateService(input);

  try {
    const result = await db.runAsync(
      `UPDATE services
       SET
         name = ?,
         category = ?,
         package_type = ?,
         description = ?,
         unit = ?,
         price = ?,
         estimated_hours = ?,
         sort_order = ?,
         is_active = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      input.name.trim(),
      input.category,
      input.package_type ?? null,
      input.description?.trim() || null,
      input.unit,
      input.price,
      input.estimated_hours ?? DEFAULT_ESTIMATED_HOURS,
      input.sort_order ?? 0,
      input.is_active === false ? 0 : 1,
      id
    );

    if (!result.changes) {
      throw new Error("Layanan tidak ditemukan");
    }

    return getServiceById(id);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

// ======================================================
// SET SERVICE ACTIVE
// ======================================================

export async function setServiceActive(
  id: number,
  active: boolean
): Promise<boolean> {
  const db = await getDatabase();

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID layanan tidak valid");
  }

  const result = await db.runAsync(
    `UPDATE services
     SET
       is_active = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    active ? 1 : 0,
    id
  );

  if (!result.changes) {
    throw new Error("Layanan tidak ditemukan");
  }

  return true;
}

// ======================================================
// DELETE SERVICE
// ======================================================

export async function deleteService(
  id: number
): Promise<boolean> {
  const db = await getDatabase();

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID layanan tidak valid");
  }

  const service = await getServiceById(id);

  if (!service) {
    throw new Error("Layanan tidak ditemukan");
  }

  // Pemeriksaan relasi untuk memastikan layanan tidak
  // sedang digunakan oleh transaksi yang sudah tercatat.
  const relatedItems = await db.getFirstAsync<{
    total: number;
  }>(
    `SELECT COUNT(*) AS total
     FROM order_items
     WHERE service_id = ?`,
    id
  );

  if ((relatedItems?.total ?? 0) > 0) {
    throw new Error(
      "Layanan sudah digunakan dalam transaksi. Nonaktifkan layanan agar riwayat transaksi tetap terjaga."
    );
  }

  const result = await db.runAsync(
    `DELETE FROM services
     WHERE id = ?`,
    id
  );

  if (!result.changes) {
    throw new Error("Gagal menghapus layanan");
  }

  return true;
}
