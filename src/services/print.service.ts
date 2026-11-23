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
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            width: 280px;
            margin: 0 auto;
            padding: 12px;
            color: #111;
            font-size: 12px;
            line-height: 1.4;
          }
          .center { text-align: center; }
          .brand { font-size: 18px; font-weight: 900; letter-spacing: 1px; }
          .info { font-size: 10px; color: #444; margin-top: 3px; }
          .divider { border-top: 1px dashed #222; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
          .bold { font-weight: bold; }
          .total-row { font-size: 15px; font-weight: 900; margin: 8px 0; }
          .footer { text-align: center; font-size: 10px; color: #555; margin-top: 16px; }
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
  // 2. LABEL (LABEL PACKING CUCIAN)
  // ====================================================================

  static generateLabelHTML(
    order: OrderWithDetails,
    copies: number,
    settingsMap?: Record<string, string>,
  ): string {
    const laundryName =
      settingsMap?.laundry_name || settingsMap?.business_name || "LAUNDRIFY";

    // Format tanggal singkat (mis. 24 Nov 2026)
    const orderDateStr = order.order_date
      ? new Date(order.order_date).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "-";

    const itemsSummary = order.items
      .map((it) => `${it.service_name} (${it.quantity} ${it.unit})`)
      .join(", ");

    let labelsHTML = "";

    for (let i = 1; i <= copies; i++) {
      labelsHTML += `
        <div class="label-sheet">
          <div class="label-header">
            <span class="brand">${escapeHTML(laundryName.toUpperCase())}</span>
            <span class="badge">LABEL ${i}/${copies}</span>
          </div>

          <div class="customer-name">${escapeHTML(order.customer_name || "Pelanggan umum")}</div>

          <div class="label-meta">
            <div><b>Order:</b> ${escapeHTML(order.order_number)}</div>
            <div><b>Tgl:</b> ${escapeHTML(orderDateStr)}</div>
          </div>

          <div class="label-details">
            <b>Ket:</b> ${escapeHTML(itemsSummary)}
            ${order.notes ? `<br/><b>Cat:</b> ${escapeHTML(order.notes)}` : ""}
          </div>

          <div class="label-footer">
            <span>Telp: ${escapeHTML(order.customer_phone || "-")}</span>
            <span style="font-weight: bold;">${order.payment_status === "paid" ? "LUNAS" : "BELUM LUNAS"}</span>
          </div>
        </div>
      `;
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
            margin: 0;
            padding: 8px;
            background: #fff;
          }
          .label-sheet {
            width: 280px;
            border: 2px solid #111;
            border-radius: 6px;
            padding: 10px;
            margin: 0 auto 14px auto;
            page-break-after: always;
            background: #fff;
          }
          .label-sheet:last-child {
            page-break-after: avoid;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1.5px solid #111;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .brand {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .badge {
            background: #111;
            color: #fff;
            font-size: 10px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 3px;
          }
          .customer-name {
            font-size: 17px;
            font-weight: 900;
            color: #000;
            margin-bottom: 6px;
            word-break: break-word;
          }
          .label-meta {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #333;
            margin-bottom: 6px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 4px;
          }
          .label-details {
            font-size: 10px;
            color: #222;
            line-height: 1.4;
            min-height: 32px;
          }
          .label-footer {
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #444;
            margin-top: 8px;
            border-top: 1px solid #111;
            padding-top: 5px;
          }
        </style>
      </head>
      <body>
        ${labelsHTML}
      </body>
      </html>
    `;
  }

  static async printLabel(
    order: OrderWithDetails,
    copies: number,
  ): Promise<void> {
    const validCopies = Math.max(1, Math.min(copies || 1, 50));
    const settings = await getAllSettings();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      if (s.value != null) {
        settingsMap[s.key] = s.value;
      }
    });

    const html = PrintService.generateLabelHTML(
      order,
      validCopies,
      settingsMap,
    );
    await Print.printAsync({ html });

    // Catat print_logs
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO print_logs (print_type, order_id, copies) VALUES ('label', ?, ?)`,
        order.id,
        validCopies,
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
