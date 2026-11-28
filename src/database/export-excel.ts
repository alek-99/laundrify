
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx-js-style";

import { getAllSettings } from "../repositories/settings.repository";
import { getExportRange, type ExportPeriod, type ExportRange } from "../utils/export-range";
import { formatDateLong, getLocalDateRangeUtc } from "../utils/format";
import { getDatabase } from "./index";

export { getExportRange };
export type { ExportPeriod, ExportRange };

type DataRow = Record<string, unknown>;

// ==========================================
// COLORS
// ==========================================

const EXCEL = {
  navy: "233F9B",
  blue: "3157D5",
  lightBlue: "EDF2FF",
  white: "FFFFFF",
  text: "202938",
  secondary: "667085",
  border: "DCE3EF",
  soft: "F5F7FB",
  alternate: "F8FAFC",
  green: "E8F7EF",
  greenText: "12805C",
};

// ==========================================
// EXCEL STYLES
// ==========================================

const titleStyle = {
  font: {
    name: "Aptos Display",
    sz: 20,
    bold: true,
    color: { rgb: EXCEL.white },
  },
  fill: {
    fgColor: { rgb: EXCEL.navy },
  },
  alignment: {
    horizontal: "center",
    vertical: "center",
  },
};

const subtitleStyle = {
  font: {
    name: "Aptos",
    sz: 11,
    bold: true,
    color: { rgb: EXCEL.white },
  },
  fill: {
    fgColor: { rgb: EXCEL.navy },
  },
  alignment: {
    horizontal: "center",
    vertical: "center",
  },
};

const headerStyle = {
  font: {
    name: "Aptos",
    sz: 10,
    bold: true,
    color: { rgb: EXCEL.white },
  },
  fill: {
    fgColor: { rgb: EXCEL.blue },
  },
  alignment: {
    horizontal: "center",
    vertical: "center",
    wrapText: true,
  },
  border: {
    top: { style: "thin", color: { rgb: EXCEL.white } },
    bottom: { style: "thin", color: { rgb: EXCEL.white } },
    left: { style: "thin", color: { rgb: EXCEL.white } },
    right: { style: "thin", color: { rgb: EXCEL.white } },
  },
};

const labelStyle = {
  font: {
    name: "Aptos",
    sz: 10,
    bold: true,
    color: { rgb: EXCEL.secondary },
  },
  fill: {
    fgColor: { rgb: EXCEL.soft },
  },
  alignment: {
    vertical: "center",
  },
};

const valueStyle = {
  font: {
    name: "Aptos",
    sz: 10,
    bold: true,
    color: { rgb: EXCEL.text },
  },
  fill: {
    fgColor: { rgb: EXCEL.soft },
  },
  alignment: {
    vertical: "center",
  },
};

const cellBorder = {
  top: { style: "thin", color: { rgb: EXCEL.border } },
  bottom: { style: "thin", color: { rgb: EXCEL.border } },
  left: { style: "thin", color: { rgb: EXCEL.border } },
  right: { style: "thin", color: { rgb: EXCEL.border } },
};

// ==========================================
// HEADER LABEL
// ==========================================

function formatColumnName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isCurrencyColumn(value: string) {
  return /harga|subtotal|total|diskon|jumlah bayar|jumlah|amount|pemasukan|pengeluaran|saldo/i.test(
    value.replace(/_/g, " "),
  );
}

// ==========================================
// CREATE STYLED SHEET
// ==========================================

function createReportSheet(
  name: string,
  rows: DataRow[],
  businessName: string,
  businessPhone: string,
  range: ExportRange,
  exportDate: Date,
) {
  const dataRows = rows.length
    ? rows
    : [{ Keterangan: "Tidak ada data pada periode ini" }];

  const keys = Object.keys(dataRows[0]);

  const lastColumn = Math.max(keys.length - 1, 1);

  const headers = keys.map(formatColumnName);

  const aoa: unknown[][] = [
    ["LAUNDRIFY"],
    ["LAPORAN MANAJEMEN LAUNDRY"],
    [],
    ["NAMA USAHA", businessName],
    ["TELEPON", businessPhone || "-"],
    ["PERIODE LAPORAN", range.label],
    ["TANGGAL EXPORT", formatDateLong(exportDate)],
    [],
    headers,
    ...dataRows.map((row) =>
      keys.map((key) => row[key] ?? "-"),
    ),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  // ========================================
  // MERGED CELLS
  // ========================================

  sheet["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: lastColumn },
    },
    {
      s: { r: 1, c: 0 },
      e: { r: 1, c: lastColumn },
    },
  ];

  // Merge metadata values
  for (let row = 3; row <= 6; row++) {
    if (lastColumn > 1) {
      sheet["!merges"].push({
        s: { r: row, c: 1 },
        e: { r: row, c: lastColumn },
      });
    }
  }

  // ========================================
  // ROW HEIGHT
  // ========================================

  sheet["!rows"] = [
    { hpt: 38 },
    { hpt: 24 },
    { hpt: 10 },
    { hpt: 23 },
    { hpt: 23 },
    { hpt: 23 },
    { hpt: 23 },
    { hpt: 10 },
    { hpt: 32 },
    ...dataRows.map(() => ({ hpt: 23 })),
  ];

  // ========================================
  // TITLE STYLE
  // ========================================

  const titleCell = sheet["A1"];
  const subtitleCell = sheet["A2"];

  if (titleCell) titleCell.s = titleStyle;
  if (subtitleCell) subtitleCell.s = subtitleStyle;

  for (let col = 1; col <= lastColumn; col++) {
    const titleAddress = XLSX.utils.encode_cell({
      r: 0,
      c: col,
    });

    const subtitleAddress = XLSX.utils.encode_cell({
      r: 1,
      c: col,
    });

    sheet[titleAddress] = {
      t: "s",
      v: "",
      s: titleStyle,
    };

    sheet[subtitleAddress] = {
      t: "s",
      v: "",
      s: subtitleStyle,
    };
  }

  // ========================================
  // METADATA STYLE
  // ========================================

  for (let row = 3; row <= 6; row++) {
    const labelAddress = XLSX.utils.encode_cell({
      r: row,
      c: 0,
    });

    const valueAddress = XLSX.utils.encode_cell({
      r: row,
      c: 1,
    });

    if (sheet[labelAddress]) {
      sheet[labelAddress].s = labelStyle;
    }

    if (sheet[valueAddress]) {
      sheet[valueAddress].s = valueStyle;
    }

    for (let col = 2; col <= lastColumn; col++) {
      const address = XLSX.utils.encode_cell({
        r: row,
        c: col,
      });

      sheet[address] = {
        t: "s",
        v: "",
        s: valueStyle,
      };
    }
  }

  // ========================================
  // TABLE HEADER STYLE
  // ========================================

  const headerRow = 8;
  const dataStartRow = 9;

  for (let col = 0; col < keys.length; col++) {
    const address = XLSX.utils.encode_cell({
      r: headerRow,
      c: col,
    });

    if (sheet[address]) {
      sheet[address].s = headerStyle;
    }
  }

  // ========================================
  // TABLE BODY STYLE
  // ========================================

  dataRows.forEach((row, rowIndex) => {
    keys.forEach((key, colIndex) => {
      const address = XLSX.utils.encode_cell({
        r: dataStartRow + rowIndex,
        c: colIndex,
      });

      const cell = sheet[address];

      if (!cell) return;

      const alternate = rowIndex % 2 === 1;

      cell.s = {
        font: {
          name: "Aptos",
          sz: 10,
          color: { rgb: EXCEL.text },
        },
        fill: {
          fgColor: {
            rgb: alternate ? EXCEL.alternate : EXCEL.white,
          },
        },
        border: cellBorder,
        alignment: {
          vertical: "center",
          horizontal:
            typeof cell.v === "number" ? "right" : "left",
          wrapText: false,
        },
      };

      // Rupiah formatting
      if (
        isCurrencyColumn(key) &&
        typeof cell.v === "number"
      ) {
        cell.z = '"Rp" #,##0;[Red]-"Rp" #,##0';
      }
    });
  });

  // ========================================
  // COLUMN WIDTH
  // ========================================

  sheet["!cols"] = keys.map((key) => {
    const values = dataRows.map((row) =>
      String(row[key] ?? ""),
    );

    const maxLength = Math.max(
      key.length,
      ...values.map((value) => value.length),
    );

    return {
      wch: Math.min(
        Math.max(maxLength + 4, 15),
        38,
      ),
    };
  });

  // First column slightly wider
  if (sheet["!cols"].length > 0) {
    sheet["!cols"][0] = {
      wch: Math.max(sheet["!cols"][0].wch || 15, 18),
    };
  }

  // ========================================
  // AUTOFILTER
  // ========================================

  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRow, c: 0 },
      e: {
        r: dataStartRow + dataRows.length - 1,
        c: keys.length - 1,
      },
    }),
  };

  // ========================================
  // PRINT SETTINGS
  // ========================================

  sheet["!pageSetup"] = {
    orientation: "landscape",
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };

  sheet["!margins"] = {
    left: 0.25,
    right: 0.25,
    top: 0.5,
    bottom: 0.5,
    header: 0.2,
    footer: 0.2,
  };

  return sheet;
}

// ==========================================
// ADD SHEET
// ==========================================

function addReportSheet(
  workbook: XLSX.WorkBook,
  name: string,
  rows: DataRow[],
  businessName: string,
  businessPhone: string,
  range: ExportRange,
  exportDate: Date,
) {
  const sheet = createReportSheet(
    name,
    rows,
    businessName,
    businessPhone,
    range,
    exportDate,
  );

  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

// ==========================================
// MAIN EXPORT
// ==========================================

export async function exportExcel(
  period: ExportPeriod,
  selectedDate: string,
) {
  const range = getExportRange(period, selectedDate);

  const db = await getDatabase();

  const { start, end } = getLocalDateRangeUtc(range.startDate, range.endExclusive);

  try {
    // ========================================
    // BUSINESS SETTINGS
    // ========================================

    const settings = await getAllSettings();
    const settingsMap = new Map(settings.map((item) => [item.key, item.value?.trim() || ""]));

    const businessName =
      settingsMap.get("laundry_name") ||
      settingsMap.get("business_name") ||
      "Laundrify";

    const businessPhone =
      settingsMap.get("laundry_phone") ||
      settingsMap.get("business_phone") ||
      "-";

    const exportDate = new Date();

    // ========================================
    // FETCH DATABASE
    // ========================================

    const [
      customers,
      services,
      categories,
      orders,
      orderItems,
      payments,
      transactions,
      history,
    ] = await Promise.all([
      db.getAllAsync<DataRow>(
        `SELECT id AS ID, name AS Nama, phone AS Telepon, address AS Alamat,
         notes AS Catatan, total_orders AS Total_Pesanan, created_at AS Dibuat
         FROM customers
         WHERE deleted_at IS NULL
         ORDER BY name COLLATE NOCASE`,
      ),

      db.getAllAsync<DataRow>(
        `SELECT id AS ID, name AS Nama_Layanan, description AS Deskripsi,
         unit AS Satuan, price AS Harga, estimated_hours AS Estimasi_Jam,
         is_active AS Aktif
         FROM services
         ORDER BY name COLLATE NOCASE`,
      ),

      db.getAllAsync<DataRow>(
        `SELECT id AS ID, name AS Nama_Kategori, type AS Jenis,
         description AS Deskripsi, is_active AS Aktif
         FROM cash_categories
         ORDER BY type, name`,
      ),

      db.getAllAsync<DataRow>(
        `SELECT o.id AS ID, o.order_number AS Nomor_Pesanan,
         COALESCE(c.name, o.customer_name, 'Pelanggan umum') AS Nama_Pelanggan,
         COALESCE(c.phone, o.customer_phone) AS Telepon,
         o.order_date AS Tanggal_Pesanan,
         o.estimated_completion AS Estimasi_Selesai,
         o.status AS Status, o.subtotal AS Subtotal,
         o.discount AS Diskon, o.total AS Total,
         o.notes AS Catatan, o.deleted_at AS Dihapus_Pada
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE o.order_date >= ? AND o.order_date < ?
         ORDER BY o.order_date DESC`,
        start,
        end,
      ),

      db.getAllAsync<DataRow>(
        `SELECT oi.id AS ID, o.order_number AS Nomor_Pesanan,
         oi.service_name AS Layanan, oi.unit AS Satuan,
         oi.quantity AS Jumlah, oi.price AS Harga_Satuan,
         oi.subtotal AS Subtotal, oi.notes AS Catatan
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.order_date >= ? AND o.order_date < ?
         ORDER BY o.order_date DESC, oi.id ASC`,
        start,
        end,
      ),

      db.getAllAsync<DataRow>(
        `SELECT p.id AS ID, o.order_number AS Nomor_Pesanan,
         COALESCE(c.name, o.customer_name, 'Pelanggan umum') AS Nama_Pelanggan,
         p.amount AS Jumlah_Bayar,
         p.method AS Metode, p.payment_date AS Tanggal_Bayar,
         p.reference_number AS Nomor_Referensi,
         p.notes AS Catatan, p.is_void AS Dibatalkan
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         LEFT JOIN customers c ON c.id = o.customer_id
         WHERE p.payment_date >= ? AND p.payment_date < ?
         ORDER BY p.payment_date DESC`,
        start,
        end,
      ),

      db.getAllAsync<DataRow>(
        `SELECT t.id AS ID, c.name AS Kategori,
         t.direction AS Jenis, t.amount AS Jumlah,
         t.description AS Keterangan,
         t.transaction_date AS Tanggal_Transaksi,
         t.payment_id AS ID_Pembayaran, t.is_void AS Dibatalkan
         FROM cash_transactions t
         JOIN cash_categories c ON c.id = t.category_id
         WHERE t.transaction_date >= ? AND t.transaction_date < ?
         ORDER BY t.transaction_date DESC`,
        start,
        end,
      ),

      db.getAllAsync<DataRow>(
        `SELECT h.id AS ID, o.order_number AS Nomor_Pesanan,
         h.old_status AS Status_Sebelumnya,
         h.new_status AS Status_Baru,
         h.notes AS Catatan, h.created_at AS Waktu
         FROM order_status_history h
         JOIN orders o ON o.id = h.order_id
         WHERE o.order_date >= ? AND o.order_date < ?
         ORDER BY h.created_at DESC`,
        start,
        end,
      ),
    ]);

    // ========================================
    // FINANCIAL SUMMARY
    // ========================================

    const finance = await db.getFirstAsync<{
      income: number;
      expense: number;
      transaction_count: number;
    }>(
      `SELECT
        COALESCE(
          SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END),
          0
        ) AS income,

        COALESCE(
          SUM(CASE WHEN direction = 'expense' THEN amount ELSE 0 END),
          0
        ) AS expense,

        COUNT(*) AS transaction_count

       FROM cash_transactions
       WHERE transaction_date >= ?
         AND transaction_date < ?
         AND is_void = 0`,
      start,
      end,
    );

    // ========================================
    // SUMMARY DATA
    // ========================================

    const income = finance?.income ?? 0;
    const expense = finance?.expense ?? 0;

    const summary: DataRow[] = [
      { Informasi: "Total Pesanan", Nilai: orders.length },
      { Informasi: "Total Pembayaran", Nilai: payments.length },
      {
        Informasi: "Total Transaksi Kas",
        Nilai: finance?.transaction_count ?? 0,
      },
      {
        Informasi: "Total Pemasukan",
        Nilai: income,
      },
      {
        Informasi: "Total Pengeluaran",
        Nilai: expense,
      },
      {
        Informasi: "Saldo Bersih",
        Nilai: income - expense,
      },
      {
        Informasi: "Jumlah Pelanggan",
        Nilai: customers.length,
      },
      {
        Informasi: "Jumlah Layanan",
        Nilai: services.length,
      },
    ];

    // ========================================
    // CREATE WORKBOOK
    // ========================================

    const workbook = XLSX.utils.book_new();

    workbook.Props = {
      Title: "Laporan Manajemen Laundry - Laundrify",
      Subject: "Laporan Transaksi dan Keuangan",
      Author: businessName,
      Company: businessName,
      Category: "Laporan Usaha",
      Keywords: "Laundrify, Laundry, Laporan, Keuangan",
      Comments: `Laporan periode ${range.label}`,
    };

    // ========================================
    // ADD ALL SHEETS
    // ========================================

    const sheetData: {
      name: string;
      rows: DataRow[];
    }[] = [
        { name: "Ringkasan", rows: summary },
        { name: "Pelanggan", rows: customers },
        { name: "Layanan", rows: services },
        { name: "Kategori Kas", rows: categories },
        { name: "Pesanan", rows: orders },
        { name: "Detail Pesanan", rows: orderItems },
        { name: "Pembayaran", rows: payments },
        { name: "Transaksi Kas", rows: transactions },
        { name: "Riwayat Status", rows: history },
      ];

    sheetData.forEach((item) => {
      addReportSheet(
        workbook,
        item.name,
        item.rows,
        businessName,
        businessPhone,
        range,
        exportDate,
      );
    });

    // ========================================
    // WRITE EXCEL
    // ========================================

    const workbookBytes = XLSX.write(workbook, {
      type: "array",
      bookType: "xlsx",
      cellStyles: true,
    });

    const safePeriod =
      period === "week"
        ? "mingguan"
        : period === "month"
          ? "bulanan"
          : "tahunan";

    const fileName =
      `Laundrify-${safePeriod}-${range.startDate}-sd-${range.endDate}.xlsx`;

    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    await file.write(new Uint8Array(workbookBytes));
    const fileUri = file.uri;

    // ========================================
    // SHARE EXCEL
    // ========================================

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      throw new Error(
        "Fitur berbagi file tidak tersedia pada perangkat ini.",
      );
    }

    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export Laporan Laundrify",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });

    return {
      fileUri,
      fileName,
      range,
    };
  } catch (error) {
    console.error("Export Excel Error:", error);

    throw new Error(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat melakukan export Excel.",
    );
  }
}
