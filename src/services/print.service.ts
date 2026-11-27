import * as Print from "expo-print";
import { getDatabase } from "../database";
import { getAllSettings } from "../repositories/settings.repository";
import type {
  MemberSubscriptionWithBalance,
  MemberUsage,
  OrderWithDetails,
} from "../types/database";

function escapeHTML(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rupiah(amount: number): string {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
}

export type ThermalPaperWidth = 58 | 88;

export interface PrintLabelOptions {
  labelsPerSheet?: number; // 2 atau 3 label per 1 kertas
  paperWidth?: ThermalPaperWidth;
  paperWidthMm?: ThermalPaperWidth;
  autoPaperSize?: boolean;
  showLogo?: boolean;
  logoUri?: string | null;
  layout?: string;
}

function resolveThermalWidth(
  options?: PrintLabelOptions,
  settingsMap?: Record<string, string>,
): ThermalPaperWidth {
  const raw = Number(
    options?.paperWidthMm ??
      options?.paperWidth ??
      settingsMap?.paper_width ??
      settingsMap?.printer_paper_width ??
      settingsMap?.thermal_paper_width ??
      58,
  );
  return raw === 88 ? 88 : 58;
}

export class PrintService {
  // ====================================================================
  // 1. RECEIPT (STRUK THERMAL)
  // ====================================================================

  static generateReceiptHTML(
    order: OrderWithDetails,
    settingsMap?: Record<string, string>,
  ): string {
    const laundryName =
      settingsMap?.laundry_name || settingsMap?.business_name || "LAUNDRIFY";
    const laundryPhone =
      settingsMap?.laundry_phone || settingsMap?.business_phone || "";
    const laundryAddress = settingsMap?.laundry_address || "";
    const footer =
      settingsMap?.invoice_footer ||
      "Terima kasih atas kepercayaan Anda.\nSimpan struk ini saat pengambilan.";

    const paperWidth = resolveThermalWidth(undefined, settingsMap);
    const bodyWidth = paperWidth === 88 ? "84mm" : "54mm";

    const itemsHTML = order.items
      .map(
        (item) => `
        <div style="margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>${escapeHTML(item.service_name)}</span>
            <span>${rupiah(item.subtotal)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; color: #555;">
            <span>${item.quantity} ${escapeHTML(item.unit)} × ${rupiah(item.price)}</span>
            ${
              item.paid_by_subscription_id
                ? `<span style="color: #2563eb; font-weight: bold;">[Kuota Member]</span>`
                : item.item_type === "package"
                  ? `<span style="color: #059669; font-weight: bold;">[Paket Baru]</span>`
                  : ""
            }
          </div>
        </div>
      `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          @page {
            size: ${paperWidth}mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 8px;
            color: #111;
            font-size: ${paperWidth === 88 ? "12px" : "11px"};
            line-height: 1.4;
          }
          .center { text-align: center; }
          .brand { font-size: ${paperWidth === 88 ? "18px" : "15px"}; font-weight: 900; letter-spacing: 1px; }
          .info { font-size: 10px; color: #444; margin-top: 3px; }
          .divider { border-top: 1px dashed #222; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
          .bold { font-weight: bold; }
          .total-row { font-size: ${paperWidth === 88 ? "15px" : "13px"}; font-weight: 900; margin: 8px 0; }
          .footer { text-align: center; font-size: 10px; color: #555; margin-top: 14px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="brand">${escapeHTML(laundryName.toUpperCase())}</div>
          ${laundryAddress ? `<div class="info">${escapeHTML(laundryAddress)}</div>` : ""}
          ${laundryPhone ? `<div class="info">Telp: ${escapeHTML(laundryPhone)}</div>` : ""}
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>No. Order:</span>
          <span class="bold">${escapeHTML(order.order_number)}</span>
        </div>
        <div class="row">
          <span>Tanggal:</span>
          <span>${escapeHTML(order.order_date)}</span>
        </div>
        <div class="row">
          <span>Pelanggan:</span>
          <span class="bold">${escapeHTML(order.customer_name || "Pelanggan umum")}</span>
        </div>
        ${
          order.customer_phone
            ? `<div class="row"><span>No. HP:</span><span>${escapeHTML(order.customer_phone)}</span></div>`
            : ""
        }
        ${
          order.estimated_completion
            ? `<div class="row"><span>Estimasi:</span><span>${escapeHTML(order.estimated_completion)}</span></div>`
            : ""
        }

        <div class="divider"></div>

        ${itemsHTML}

        <div class="divider"></div>

        <div class="row">
          <span>Subtotal:</span>
          <span>${rupiah(order.subtotal)}</span>
        </div>
        ${
          order.member_discount > 0
            ? `<div class="row" style="color: #2563eb;"><span>Diskon Kuota Member:</span><span>-${rupiah(order.member_discount)}</span></div>`
            : ""
        }
        ${
          order.discount > 0
            ? `<div class="row"><span>Diskon:</span><span>-${rupiah(order.discount)}</span></div>`
            : ""
        }

        <div class="divider"></div>

        <div class="row total-row">
          <span>TOTAL:</span>
          <span>${rupiah(order.total)}</span>
        </div>
        <div class="row">
          <span>Sudah Dibayar:</span>
          <span class="bold">${rupiah(order.paid)}</span>
        </div>
        <div class="row">
          <span>Sisa Tagihan:</span>
          <span class="bold" style="${order.remaining > 0 ? "color: #dc2626;" : "color: #16a34a;"}">
            ${order.remaining > 0 ? rupiah(order.remaining) : "LUNAS"}
          </span>
        </div>

        ${
          order.notes
            ? `<div class="divider"></div><div><b>Catatan:</b> ${escapeHTML(order.notes)}</div>`
            : ""
        }

        <div class="divider"></div>

        <div class="footer">
          ${escapeHTML(footer).replace(/\n/g, "<br/>")}
        </div>
      </body>
      </html>
    `;
  }

  static async printReceipt(
    order: OrderWithDetails,
    options?: { copies?: number },
  ): Promise<void> {
    const settings = await getAllSettings();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      if (s.value != null) {
        settingsMap[s.key] = s.value;
      }
    });

    const html = PrintService.generateReceiptHTML(order, settingsMap);
    await Print.printAsync({ html });

    // Catat print_logs
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO print_logs (print_type, order_id, copies) VALUES ('receipt', ?, ?)`,
        order.id,
        options?.copies ?? 1,
      );
    } catch (e) {
      console.warn("Gagal mencatat print_logs receipt:", e);
    }
  }

  // ====================================================================
  // 2. LABEL (2 ATAU 3 LABEL DALAM 1 KERTAS THERMAL 58MM / 88MM + LOGO)
  // ====================================================================

  static generateLabelHTML(
    order: OrderWithDetails,
    copies: number,
    settingsMap?: Record<string, string>,
    options?: PrintLabelOptions,
  ): string {
    const laundryName =
      settingsMap?.laundry_name || settingsMap?.business_name || "LAUNDRIFY";
    const laundryTagline =
      settingsMap?.laundry_tagline || "LAUNDRY & DRY CLEAN";

    // Ambil URL / Base64 logo dari opsi atau settings database
    const logoUri =
      options?.logoUri ||
      settingsMap?.laundry_logo ||
      settingsMap?.business_logo ||
      settingsMap?.logo_url ||
      settingsMap?.logo_base64 ||
      "";

    // Otomatis 58mm atau 88mm
    const paperWidth = resolveThermalWidth(options, settingsMap);
    const is58mm = paperWidth === 58;
    const printableWidth = is58mm ? "54mm" : "84mm";

    // Batasi 2 atau 3 label dalam 1 kertas untuk menghemat kertas thermal
    const labelsPerSheet = Math.min(
      3,
      Math.max(2, Number(options?.labelsPerSheet ?? copies) || 3),
    );

    const orderDateStr = order.order_date
      ? new Date(order.order_date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    const itemsSummary =
      order.items
        ?.map((it) => `${it.service_name} (${it.quantity} ${it.unit})`)
        .join(", ") || "-";

    const isPaid = order.payment_status === "paid" || order.remaining <= 0;
    const statusBayarText = isPaid
      ? "LUNAS ✓"
      : `BELUM LUNAS (Sisa ${rupiah(order.remaining)})`;

    // Logo HTML (Gambar logo outlet jika ada, atau ikon emblem laundry + teks)
    const logoHTML = logoUri
      ? `<img src="${escapeHTML(logoUri)}" class="logo-img" alt="Logo" />`
      : `
        <div class="logo-emblem">
          <svg width="${is58mm ? "12" : "15"}" height="${is58mm ? "12" : "15"}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="2" width="18" height="20" rx="3"/>
            <circle cx="12" cy="13" r="5"/>
            <line x1="7" y1="6" x2="7.01" y2="6"/>
            <line x1="11" y1="6" x2="11.01" y2="6"/>
          </svg>
        </div>
      `;

    let labelsHTML = "";

    for (let i = 1; i <= labelsPerSheet; i++) {
      labelsHTML += `
        <div class="label-box">
          <div class="label-header">
            <div class="brand-wrap">
              ${logoHTML}
              <div>
                <div class="brand">${escapeHTML(laundryName.toUpperCase())}</div>
                ${!is58mm ? `<div class="tagline">${escapeHTML(laundryTagline)}</div>` : ""}
              </div>
            </div>
            <span class="badge">${i}/${labelsPerSheet}</span>
          </div>

          <div class="line">
            <span class="key">Nama:</span>
            <span class="customer-name">${escapeHTML(order.customer_name || "Pelanggan umum")}</span>
          </div>

          <div class="line meta-row">
            <span><span class="key">Order ID:</span> <b>${escapeHTML(order.order_number)}</b></span>
            <span>${escapeHTML(orderDateStr)}</span>
          </div>

          <div class="line details">
            <span class="key">Ket:</span> ${escapeHTML(itemsSummary)}
            ${order.notes ? ` · <i>(${escapeHTML(order.notes)})</i>` : ""}
          </div>

          <div class="label-footer">
            <span><span class="key">Telpon:</span> ${escapeHTML(order.customer_phone || "-")}</span>
            <span class="pay-status">${escapeHTML(statusBayarText)}</span>
          </div>
        </div>
        ${
          i < labelsPerSheet
            ? `<div class="cut-line"><span>✂ POTONG DI SINI</span></div>`
            : ""
        }
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          @page {
            size: ${paperWidth}mm auto;
            margin: 0;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            width: ${printableWidth};
            margin: 0 auto;
            padding: ${is58mm ? "2mm 1mm" : "3mm 2mm"};
            background: #fff;
            color: #000;
          }
          .sheet-wrapper {
            width: 100%;
            page-break-inside: avoid;
          }
          .label-box {
            width: 100%;
            border: 1.5px solid #000;
            border-radius: 4px;
            padding: ${is58mm ? "4px 5px" : "6px 8px"};
            background: #fff;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1.2px solid #000;
            padding-bottom: ${is58mm ? "3px" : "4px"};
            margin-bottom: ${is58mm ? "3px" : "4px"};
          }
          .brand-wrap {
            display: flex;
            align-items: center;
            gap: ${is58mm ? "4px" : "6px"};
          }
          .logo-emblem {
            width: ${is58mm ? "18px" : "22px"};
            height: ${is58mm ? "18px" : "22px"};
            border-radius: 4px;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .logo-img {
            width: ${is58mm ? "20px" : "26px"};
            height: ${is58mm ? "20px" : "26px"};
            object-fit: contain;
            border-radius: 3px;
            flex-shrink: 0;
          }
          .brand {
            font-size: ${is58mm ? "9.5px" : "11.5px"};
            font-weight: 900;
            letter-spacing: 0.4px;
            line-height: 1.1;
          }
          .tagline {
            font-size: 7.5px;
            font-weight: 700;
            color: #333;
            margin-top: 1px;
          }
          .badge {
            border: 1px solid #000;
            background: #000;
            color: #fff;
            font-size: ${is58mm ? "8px" : "9px"};
            font-weight: 900;
            padding: 1px 5px;
            border-radius: 3px;
          }
          .line {
            font-size: ${is58mm ? "8.5px" : "10px"};
            line-height: 1.28;
            margin-bottom: 2px;
            word-break: break-word;
          }
          .key {
            font-weight: 700;
            color: #222;
          }
          .customer-name {
            font-size: ${is58mm ? "10px" : "12px"};
            font-weight: 900;
            color: #000;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            gap: 4px;
          }
          .details {
            border-top: 1px dashed #999;
            padding-top: 2px;
            margin-top: 2px;
          }
          .label-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 4px;
            font-size: ${is58mm ? "8px" : "9.5px"};
            margin-top: 3px;
            border-top: 1px solid #000;
            padding-top: 2.5px;
          }
          .pay-status {
            font-weight: 900;
          }
          .cut-line {
            position: relative;
            text-align: center;
            margin: ${is58mm ? "4px 0" : "6px 0"};
            border-bottom: 1px dashed #000;
            line-height: 0.1em;
          }
          .cut-line span {
            background: #fff;
            padding: 0 5px;
            font-size: ${is58mm ? "7px" : "8px"};
            font-weight: 800;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="sheet-wrapper">
          ${labelsHTML}
        </div>
      </body>
      </html>
    `;
  }

  static async printLabel(
    order: OrderWithDetails,
    copies: number,
    options?: PrintLabelOptions,
  ): Promise<void> {
    // 2 atau 3 label dalam 1 lembar kertas untuk menghemat kertas thermal
    const validLabelsPerSheet = Math.min(
      3,
      Math.max(2, Number(options?.labelsPerSheet ?? copies) || 3),
    );

    const settings = await getAllSettings();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      if (s.value != null) {
        settingsMap[s.key] = s.value;
      }
    });

    const html = PrintService.generateLabelHTML(
      order,
      validLabelsPerSheet,
      settingsMap,
      {
        ...options,
        labelsPerSheet: validLabelsPerSheet,
      },
    );

    await Print.printAsync({ html });

    // Catat print_logs
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO print_logs (print_type, order_id, copies) VALUES ('label', ?, ?)`,
        order.id,
        validLabelsPerSheet,
      );
    } catch (e) {
      console.warn("Gagal mencatat print_logs label:", e);
    }
  }

  // ====================================================================
  // 3. MEMBER CARD (KARTU LANGGANAN 15 KOTAK)
  // ====================================================================

  static generateMemberCardHTML(
    subscription: MemberSubscriptionWithBalance,
    customer: { name: string; phone?: string | null },
    usages: MemberUsage[],
    page = 1,
    settingsMap?: Record<string, string>,
  ): string {
    const laundryName =
      settingsMap?.laundry_name || settingsMap?.business_name || "LAUNDRIFY";

    const BOXES_PER_PAGE = 15;
    const startIndex = (page - 1) * BOXES_PER_PAGE;
    const pageUsages = usages.slice(startIndex, startIndex + BOXES_PER_PAGE);
    const totalPages = Math.max(1, Math.ceil(usages.length / BOXES_PER_PAGE));

    const startDateStr = subscription.start_date
      ? new Date(subscription.start_date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    // Bangun 15 kotak
    let boxesHTML = "";
    for (let i = 0; i < BOXES_PER_PAGE; i++) {
      const slotNumber = startIndex + i + 1;
      const usage = pageUsages[i];

      if (usage) {
        const usageDate = usage.used_at
          ? new Date(usage.used_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "numeric",
              year: "2-digit",
            })
          : "-";

        boxesHTML += `
          <div class="box box-filled">
            <div class="box-num">#${slotNumber} ✓</div>
            <div class="box-date">${escapeHTML(usageDate)}</div>
            <div class="box-kg">${usage.kg_used} KG</div>
          </div>
        `;
      } else {
        boxesHTML += `
          <div class="box box-empty">
            <div class="box-num-empty">${slotNumber}</div>
            <div class="box-placeholder">Tgl: .....<br/>.. KG</div>
          </div>
        `;
      }
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, sans-serif;
            background: #fff;
            padding: 10px;
          }
          .card-container {
            width: 320px;
            margin: 0 auto;
            border: 2px solid #1e3a8a;
            border-radius: 8px;
            padding: 12px;
            background: #f8fafc;
            color: #0f172a;
          }
          .card-header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .brand {
            font-size: 15px;
            font-weight: 900;
            color: #1e3a8a;
            letter-spacing: 1px;
          }
          .card-title {
            font-size: 11px;
            font-weight: bold;
            color: #475569;
            margin-top: 2px;
          }
          .info-table {
            width: 100%;
            font-size: 11px;
            margin-bottom: 10px;
            border-collapse: collapse;
          }
          .info-table td {
            padding: 2px 4px;
            vertical-align: top;
          }
          .label {
            color: #64748b;
            width: 85px;
            font-weight: 600;
          }
          .value {
            font-weight: bold;
            color: #0f172a;
          }
          .quota-banner {
            background: #e0f2fe;
            border: 1px solid #7dd3fc;
            border-radius: 4px;
            padding: 6px;
            text-align: center;
            margin-bottom: 10px;
            font-size: 11px;
            font-weight: bold;
            color: #0369a1;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            margin-bottom: 10px;
          }
          .box {
            border-radius: 5px;
            height: 60px;
            padding: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            text-align: center;
          }
          .box-filled {
            border: 1.5px solid #2563eb;
            background: #eff6ff;
          }
          .box-num {
            font-size: 8px;
            font-weight: bold;
            color: #1d4ed8;
          }
          .box-date {
            font-size: 9px;
            color: #334155;
            font-weight: 600;
          }
          .box-kg {
            font-size: 12px;
            font-weight: 900;
            color: #1e3a8a;
          }
          .box-empty {
            border: 1.5px dashed #94a3b8;
            background: #ffffff;
          }
          .box-num-empty {
            font-size: 9px;
            color: #94a3b8;
            font-weight: bold;
          }
          .box-placeholder {
            font-size: 9px;
            color: #94a3b8;
            line-height: 1.3;
          }
          .card-footer {
            text-align: center;
            font-size: 9px;
            color: #64748b;
            border-top: 1px dashed #cbd5e1;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div class="card-header">
            <div class="brand">${escapeHTML(laundryName.toUpperCase())}</div>
            <div class="card-title">KARTU LANGGANAN MEMBER</div>
          </div>

          <table class="info-table">
            <tr>
              <td class="label">No. Member</td>
              <td class="value">: ${escapeHTML(subscription.member_no)}</td>
            </tr>
            <tr>
              <td class="label">Nama</td>
              <td class="value">: ${escapeHTML(customer.name)}</td>
            </tr>
            <tr>
              <td class="label">No. HP</td>
              <td class="value">: ${escapeHTML(customer.phone || "-")}</td>
            </tr>
            <tr>
              <td class="label">Tipe Paket</td>
              <td class="value">: ${escapeHTML(subscription.package_name || subscription.package_type)}</td>
            </tr>
            <tr>
              <td class="label">Tgl Berlaku</td>
              <td class="value">: ${escapeHTML(startDateStr)}</td>
            </tr>
          </table>

          <div class="quota-banner">
            Sisa Kuota: ${subscription.remaining_kg} KG / ${subscription.quota_kg} KG
            ${subscription.status === "used_up" ? " (HABIS)" : ""}
          </div>

          <!-- 15 KOTAK PEMAKAIAN -->
          <div class="grid-container">
            ${boxesHTML}
          </div>

          <div class="card-footer">
            Halaman ${page} dari ${Math.max(page, totalPages)} · Tunjukkan kartu saat serah cucian
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async printMemberCard(
    subscriptionId: number,
    page = 1,
  ): Promise<void> {
    const db = await getDatabase();
    const sub = await db.getFirstAsync<MemberSubscriptionWithBalance>(
      `SELECT * FROM v_subscription_balance WHERE id = ?`,
      subscriptionId,
    );

    if (!sub) {
      throw new Error("Langganan member tidak ditemukan");
    }

    const customer = await db.getFirstAsync<{ name: string; phone: string | null }>(
      `SELECT name, phone FROM customers WHERE id = ?`,
      sub.customer_id,
    );

    const usages = await db.getAllAsync<MemberUsage>(
      `SELECT * FROM member_usages WHERE subscription_id = ? AND is_void = 0 ORDER BY used_at ASC, id ASC`,
      subscriptionId,
    );

    const settings = await getAllSettings();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      if (s.value != null) {
        settingsMap[s.key] = s.value;
      }
    });

    const html = PrintService.generateMemberCardHTML(
      sub,
      customer || { name: "Pelanggan" },
      usages,
      page,
      settingsMap,
    );

    await Print.printAsync({ html });

    // Update card_printed_at & catat log
    try {
      await db.runAsync(
        `UPDATE member_subscriptions SET card_printed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        subscriptionId,
      );
      await db.runAsync(
        `INSERT INTO print_logs (print_type, subscription_id, copies) VALUES ('member_card', ?, 1)`,
        subscriptionId,
      );
    } catch (e) {
      console.warn("Gagal update status print kartu member:", e);
    }
  }
}