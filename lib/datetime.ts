export const APP_TIMEZONE = "Asia/Jakarta";

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatInAppTz(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  locale = "id-ID",
) {
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(date);
}

/** Admin list timestamps: 2026-07-28 14:05:09 (WIB) */
export function formatAppDateTime(value: string | Date | null | undefined) {
  const date = toDate(value);
  if (!date) return "-";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Short date for tables: 28 Jul 2026 */
export function formatAppDate(value: string | Date | null | undefined) {
  return formatInAppTz(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Long date: 28 Juli 2026 */
export function formatAppLongDate(value: string | Date | null | undefined) {
  return formatInAppTz(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Email-style datetime in WIB */
export function formatAppMailDateTime(value: string | Date | null | undefined) {
  return formatInAppTz(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isAppYmd(value: string | null | undefined): value is string {
  return Boolean(value && YMD_RE.test(value));
}

/** Current calendar date in Asia/Jakarta as YYYY-MM-DD */
export function getAppYmd(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shift a YYYY-MM-DD calendar date by N months (Jakarta calendar math). */
export function shiftAppYmdMonths(ymd: string, months: number) {
  if (!isAppYmd(ymd)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1 + months, day));
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive start of Jakarta day as absolute Date */
export function appYmdStart(ymd: string) {
  if (!isAppYmd(ymd)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  return new Date(`${ymd}T00:00:00+07:00`);
}

/** Inclusive end of Jakarta day as absolute Date */
export function appYmdEnd(ymd: string) {
  if (!isAppYmd(ymd)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  return new Date(`${ymd}T23:59:59.999+07:00`);
}

export function getDefaultSphRangeYmd() {
  const to = getAppYmd();
  const from = shiftAppYmdMonths(to, -3);
  return { from, to };
}
