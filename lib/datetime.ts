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
