import * as Linking from "expo-linking";
import { getDatabase } from "../database";
import type { WhatsAppMessageType } from "../types/database";

export class WhatsAppService {
  /**
   * Normalisasi nomor telepon ke format internasional (mis. 0812... -> 62812...).
   */
  static normalizePhone(phone: string): string {
    let number = (phone ?? "").replace(/\D/g, "");
    if (number.startsWith("0")) {
      number = "62" + number.slice(1);
    } else if (number.startsWith("8")) {
      number = "62" + number;
    }
    return number;
  }

  /**
   * Bangun tautan URL wa.me
   */
  static link(phone: string, text: string): string {
    const normalized = WhatsAppService.normalizePhone(phone);
    return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Buka WhatsApp dan catat ke whatsapp_logs
   */
  static async open(
    phone: string,
    text: string,
    meta?: {
      orderId?: number | null;
      customerId?: number | null;
      messageType?: WhatsAppMessageType;
    },
  ): Promise<boolean> {
    const normalized = WhatsAppService.normalizePhone(phone);
    if (!normalized || normalized.length < 8) {
      throw new Error("Nomor telepon tidak valid untuk WhatsApp");
    }

    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
    await Linking.openURL(url);

    // Catat ke whatsapp_logs
    try {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO whatsapp_logs (order_id, customer_id, phone, message_type, message)
         VALUES (?, ?, ?, ?, ?)`,
        meta?.orderId ?? null,
        meta?.customerId ?? null,
        phone,
        meta?.messageType ?? "invoice",
        text,
      );
    } catch (err) {
      console.warn("Gagal mencatat whatsapp_logs:", err);
    }

    return true;
  }
}
