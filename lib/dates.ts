// Calendar-day / timezone helpers. Days are "YYYY-MM-DD" strings (Postgres
// `date`); the user's IANA timezone (`user.timezone`) decides which day an
// instant belongs to. Uses Intl only, so it works on server and client.

import { format } from "date-fns";

export const DEFAULT_TIME_ZONE = "UTC";

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The user's timezone, falling back to UTC when unset or invalid. */
export function resolveTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

export function isDayString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
  );
}

export function isTimeString(value: unknown): value is string {
  return typeof value === "string" && TIME_RE.test(value);
}

function zonedParts(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Calendar day ("YYYY-MM-DD") of `instant` in `tz`. */
export function dayInTimeZone(instant: Date, tz: string): string {
  const p = zonedParts(instant, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function todayInTimeZone(tz: string): string {
  return dayInTimeZone(new Date(), tz);
}

/** Wall-clock "HH:mm" of `instant` in `tz` (for time inputs). */
export function timeInTimeZone(instant: Date, tz: string): string {
  const p = zonedParts(instant, tz);
  return `${p.hour}:${p.minute}`;
}

/** Display time (e.g. "7:05 AM") of `instant` in `tz`; fixed locale so SSR and hydration agree. */
export function formatTimeInTimeZone(instant: Date, tz: string): string {
  return instant.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  });
}

function offsetMs(instant: Date, tz: string): number {
  const p = zonedParts(instant, tz);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instant of wall-clock `day` + `time` ("HH:mm") in `tz`. */
export function zonedTimeToInstant(day: string, time: string, tz: string) {
  const [y, mo, d] = day.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes settle the offset across DST transitions.
  const first = wall - offsetMs(new Date(wall), tz);
  return new Date(wall - offsetMs(new Date(first), tz));
}

/** Day string -> local-midnight Date, for formatting and date pickers only. */
export function parseDay(day: string): Date {
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

/** Local Date (e.g. from a date picker) -> day string. */
export function formatDay(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
