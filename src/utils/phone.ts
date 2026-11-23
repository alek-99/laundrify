/**
 * Helper nomor telepon / WhatsApp.
 * Disimpan sebagai teks apa adanya (sudah dirapikan), normalisasi ke format
 * internasional dilakukan saat membuka WhatsApp (lihat orders/[id].tsx).
 */

export const MAX_CUSTOMER_NAME_LENGTH = 100;

/** Hanya izinkan digit, spasi, +, - dan tanda kurung saat mengetik. */
export function sanitizePhoneInput(value: string) {
  return value.replace(/[^\d+\s\-()]/g, "").slice(0, 20);
}

/** Rapikan nomor: trim + rapatkan spasi ganda. Kosong -> null. */
export function normalizePhone(value?: string | null) {
  const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
  return cleaned.length ? cleaned : null;
}

/** Nomor valid bila jumlah digit 8–15 (standar E.164). */
export function isValidPhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function normalizeName(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}
