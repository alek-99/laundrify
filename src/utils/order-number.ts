export function generateOrderNumber() {
  const now = new Date();

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replaceAll("-", "");

  const random = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `LDR-${date}-${random}`;
}
