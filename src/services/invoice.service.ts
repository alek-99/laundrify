import { WhatsAppService } from "./whatsapp.service";
import type { OrderWithDetails } from "../types/database";
import { getAllSettings } from "../repositories/settings.repository";

function money(amount: number): string {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
}

export class InvoiceService {
  /**
   * Format teks invoice WhatsApp sesuai spesifikasi Laundrify v2
   */
  static build(order: OrderWithDetails, settingsMap?: Record<string, string>): string {
    const laundryName =
      settingsMap?.laundry_name || settingsMap?.business_name || "Laundrify";
    const laundryPhone =
      settingsMap?.laundry_phone || settingsMap?.business_phone || "";
    const laundryAddress = settingsMap?.laundry_address || "";
    const bankName = settingsMap?.bank_name || "";
    const bankNumber = settingsMap?.bank_account_number || "";
    const bankHolder = settingsMap?.bank_account_holder || "";
    const footer =
      settingsMap?.invoice_footer ||
      "Terima kasih sudah mencuci di tempat kami.";

    const statusIndo: Record<string, string> = {
      received: "Diterima",
      processing: "Diproses",
      ready: "Siap Diambil",
      completed: "Selesai",
    };

    const paymentStatusIndo: Record<string, string> = {
      paid: "LUNAS",
      partial: "SEBAGIAN (BELUM LUNAS)",
      unpaid: "BELUM BAYAR",
    };

    const itemsText = order.items
      .map((item, idx) => {
        let label = `${idx + 1}. *${item.service_name}*`;
        if (item.paid_by_subscription_id) {
          label += ` _(Pakai Kuota Member)_`;
        } else if (item.item_type === "package") {
          label += ` _(Paket Member)_`;
        }
        return `${label}\n   ${item.quantity} ${item.unit} × ${money(item.price)} = ${money(item.subtotal)}`;
      })
      .join("\n");

    let summaryText = `Subtotal: ${money(order.subtotal)}`;
    if (order.member_discount > 0) {
      summaryText += `\nDiskon Member: -${money(order.member_discount)}`;
    }
    if (order.discount > 0) {
      summaryText += `\nDiskon: -${money(order.discount)}`;
    }
    summaryText += `\n*TOTAL: ${money(order.total)}*`;

    let paymentInfo = `Status Bayar: *${paymentStatusIndo[order.payment_status] || order.payment_status?.toUpperCase() || "BELUM BAYAR"}*`;
    if (order.paid > 0) {
      paymentInfo += `\nSudah Dibayar: ${money(order.paid)}`;
    }
    if (order.remaining > 0) {
      paymentInfo += `\n*Sisa Tagihan: ${money(order.remaining)}*`;
    }

    let bankInfo = "";
    if (order.remaining > 0 && bankName && bankNumber) {
      bankInfo = `\n💳 *Pembayaran Transfer:*\nBank: ${bankName}\nNo. Rek: ${bankNumber}\nA.n: ${bankHolder || "-"}\n`;
    }

    return `
🧺 *${laundryName.toUpperCase()}*
${laundryAddress ? laundryAddress + "\n" : ""}${laundryPhone ? "Telp/WA: " + laundryPhone + "\n" : ""}
━━━━━━━━━━━━━━━━━━━━
🧾 *INVOICE PESANAN*
No. Order : *${order.order_number}*
Tanggal   : ${order.order_date}
Pelanggan : *${order.customer_name || "Pelanggan umum"}*
${order.customer_phone ? "No. HP    : " + order.customer_phone + "\n" : ""}Status    : *${statusIndo[order.status] || order.status}*
${order.estimated_completion ? "Estimasi  : " + order.estimated_completion + "\n" : ""}
━━━━━━━━━━━━━━━━━━━━
*RINCIAN ITEM:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
${summaryText}
${paymentInfo}
${bankInfo}
${order.notes ? `Catatan: ${order.notes}\n` : ""}
━━━━━━━━━━━━━━━━━━━━
_${footer}_
`.trim();
  }

  /**
   * Buka WhatsApp dengan invoice yang sudah diformat
   */
  static async send(order: OrderWithDetails): Promise<boolean> {
    if (!order.customer_phone) {
      throw new Error("Nomor WhatsApp pelanggan tidak tersedia");
    }

    const settings = await getAllSettings();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      if (s.value != null) {
        settingsMap[s.key] = s.value;
      }
    });

    const text = InvoiceService.build(order, settingsMap);
    return WhatsAppService.open(order.customer_phone, text, {
      orderId: order.id,
      customerId: order.customer_id ?? null,
      messageType: "invoice",
    });
  }
}
