/**
 * Time zone helpers. Everything is stored in UTC and shown in the business
 * time zone (America/New_York). Built on Intl so there's no date library and
 * DST transitions are handled by the platform's tz database.
 */

import { site } from "@/config/site";

export const TZ = site.timezone;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let f = partsFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    partsFormatters.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export function zonedParts(date: Date, tz: string = TZ): ZonedParts {
  const out: Record<string, string> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday),
  };
}

/** Offset of `tz` from UTC at the given instant, in minutes (New York is -240 or -300). */
export function tzOffsetMinutes(date: Date, tz: string = TZ): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD for the local calendar date of an instant. */
export function localDate(date: Date, tz: string = TZ): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes after local midnight for an instant. */
export function localMinute(date: Date, tz: string = TZ): number {
  const p = zonedParts(date, tz);
  return p.hour * 60 + p.minute;
}

function parseDate(date: string): [number, number, number] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * The UTC instant for a local wall-clock time. `minuteOfDay` is minutes after
 * local midnight. Wall times that don't exist (the skipped hour in spring) roll
 * forward, which never matters for after-school hours.
 */
export function zonedToUtc(date: string, minuteOfDay: number, tz: string = TZ): Date {
  const [y, mo, d] = parseDate(date);
  const wallAsUtc = Date.UTC(y, mo - 1, d, 0, minuteOfDay);
  const first = tzOffsetMinutes(new Date(wallAsUtc), tz);
  let utc = wallAsUtc - first * 60000;
  const second = tzOffsetMinutes(new Date(utc), tz);
  if (second !== first) utc = wallAsUtc - second * 60000;
  return new Date(utc);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parseDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** 0 = Sunday. */
export function weekdayOf(date: string): number {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Whole calendar days from `a` to `b` (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parseDate(a);
  const [by, bm, bd] = parseDate(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** Monday of the local week containing `date`. */
export function startOfWeek(date: string): string {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: string, months: number): string {
  const [y, m] = parseDate(date);
  const t = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

// ---------------------------------------------------------------------------
// Display formatting (always in the business time zone)
// ---------------------------------------------------------------------------

const displayFormatters = new Map<string, Intl.DateTimeFormat>();

function fmt(key: string, opts: Intl.DateTimeFormatOptions) {
  let f = displayFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...opts });
    displayFormatters.set(key, f);
  }
  return f;
}

function toDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

/** "4:30 PM" */
export function formatTime(value: Date | string): string {
  return fmt("time", { hour: "numeric", minute: "2-digit" }).format(toDate(value));
}

/** "Thu, Nov 6" */
export function formatDay(value: Date | string): string {
  return fmt("day", { weekday: "short", month: "short", day: "numeric" }).format(toDate(value));
}

/** "Thursday, November 6" */
export function formatDayLong(value: Date | string): string {
  return fmt("dayLong", { weekday: "long", month: "long", day: "numeric" }).format(toDate(value));
}

/** "Thu, Nov 6 at 4:30 PM" */
export function formatDateTime(value: Date | string): string {
  return `${formatDay(value)} at ${formatTime(value)}`;
}

/** A local YYYY-MM-DD date as "Thu, Nov 6" (no time zone shift). */
export function formatLocalDate(date: string, style: "short" | "long" = "short"): string {
  const [y, m, d] = parseDate(date);
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }
      : { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-US", opts).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Minutes after midnight as "4:30 PM". */
export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

/** "today", "tomorrow", "in 5 days", "5 days ago" */
export function relativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
