export type ExportPeriod = "week" | "month" | "year";

export interface ExportRange {
  startDate: string;
  endDate: string;
  endExclusive: string;
  label: string;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function dateString(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    throw new Error("Tanggal harus menggunakan format YYYY-MM-DD.");
  }

  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    throw new Error("Tanggal yang dimasukkan tidak valid.");
  }

  return date;
}

export function getExportRange(
  period: ExportPeriod,
  selectedDate: string,
): ExportRange {
  const selected = parseDateInput(selectedDate);

  let start = new Date(selected);
  let end = new Date(selected);

  if (period === "week") {
    const day = (selected.getDay() + 6) % 7;

    start.setDate(selected.getDate() - day);

    end = new Date(start);
    end.setDate(start.getDate() + 6);
  } else if (period === "month") {
    start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  } else {
    start = new Date(selected.getFullYear(), 0, 1);
    end = new Date(selected.getFullYear(), 11, 31);
  }

  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const label =
    period === "week"
      ? `Minggu ${dateString(start)} s.d. ${dateString(end)}`
      : period === "month"
        ? `Bulan ${pad2(selected.getMonth() + 1)}-${selected.getFullYear()}`
        : `Tahun ${selected.getFullYear()}`;

  return {
    startDate: dateString(start),
    endDate: dateString(end),
    endExclusive: dateString(endExclusive),
    label,
  };
}
