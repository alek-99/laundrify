const CURRENCY_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("id-ID");

const DATE_FULL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATE_MEDIUM_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DATE_LONG_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
});

const DATE_TIME_SHORT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatMoney(value: number | null | undefined): string {
  return CURRENCY_FORMATTER.format(value || 0);
}

export function formatNumber(value: number | null | undefined): string {
  return NUMBER_FORMATTER.format(value || 0);
}

/**
 * Konversi Date JS menjadi string UTC SQLite `'YYYY-MM-DD HH:MM:SS'`
 * yang konsisten dengan `CURRENT_TIMESTAMP` agar perbandingan range tetap SARGable.
 */
export function toSqliteUtcTimestamp(date: Date = new Date()): string {
  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ` +
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`
  );
}

/**
 * Rentang `[start, end)` dalam timestamp UTC SQLite untuk hari kalender lokal tertentu.
 */
export function getLocalDayRangeUtc(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const startLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);
  return {
    start: toSqliteUtcTimestamp(startLocal),
    end: toSqliteUtcTimestamp(endLocal),
  };
}

/**
 * Rentang `[start, end)` dalam timestamp UTC SQLite dari string tanggal lokal `'YYYY-MM-DD'`.
 */
export function getLocalDateRangeUtc(
  startDateStr: string,
  endExclusiveDateStr: string,
): { start: string; end: string } {
  const parseYmd = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };

  return {
    start: toSqliteUtcTimestamp(parseYmd(startDateStr)),
    end: toSqliteUtcTimestamp(parseYmd(endExclusiveDateStr)),
  };
}

/**
 * Rentang `[start, end)` dalam timestamp UTC SQLite untuk satu tahun kalender lokal.
 */
export function getLocalYearRangeUtc(year: number): {
  start: string;
  end: string;
} {
  return {
    start: toSqliteUtcTimestamp(new Date(year, 0, 1, 0, 0, 0, 0)),
    end: toSqliteUtcTimestamp(new Date(year + 1, 0, 1, 0, 0, 0, 0)),
  };
}

/**
 * Parse string timestamp SQLite UTC (`YYYY-MM-DD HH:MM:SS`) atau ISO string menjadi Date.
 */
export function parseSqliteTimestamp(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    const parsed = new Date(`${trimmed.replace(" ", "T")}Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)
      ? `${trimmed}Z`
      : trimmed;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateFull(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : parseSqliteTimestamp(value);
  if (!date) return typeof value === "string" ? value : "-";
  return DATE_FULL_FORMATTER.format(date);
}

export function formatDateMedium(value?: string | null): string {
  const date = parseSqliteTimestamp(value);
  if (!date) return value || "-";
  return DATE_MEDIUM_FORMATTER.format(date);
}

export function formatDateLong(value: Date | string | null | undefined): string {
  const date = value instanceof Date ? value : parseSqliteTimestamp(value);
  if (!date) return typeof value === "string" ? value.slice(0, 10) : "-";
  return DATE_LONG_FORMATTER.format(date);
}

export function formatDateShort(value?: string | null): string {
  const date = parseSqliteTimestamp(value);
  if (!date) return "";
  return DATE_SHORT_FORMATTER.format(date);
}

export function formatDateTimeShort(value?: string | null): string {
  const date = parseSqliteTimestamp(value);
  if (!date) return value || "-";
  return DATE_TIME_SHORT_FORMATTER.format(date);
}
