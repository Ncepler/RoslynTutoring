/**
 * Single source of truth for everything that might change before launch.
 * The business name, school, contact email and prices live here so they can
 * be swapped in one place. Nothing in the app logic should hardcode them.
 */

export const site = {
  /** Business name. Not decided yet; swap here and it changes everywhere. */
  name: "Tutoring",
  /** Short form for tight spaces (tab titles, emails). */
  shortName: "Tutoring",
  /** The school community served first. Copy only, never used in logic. */
  school: "Roslyn",
  area: "Roslyn, NY",
  /** Shared group inbox. Placeholder until the real address exists. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@example.com",
  /** Set NEXT_PUBLIC_SITE_URL once there's a domain. On Vercel it falls back to the production URL. */
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, ""),
  timezone: "America/New_York",
  /** Grades we tutor. Validation and the booking form read from this. */
  grades: [8, 9, 10] as const,
  description:
    "One-on-one pre-test review on Zoom for Roslyn 8th to 10th graders, from Roslyn students who have earned 100s on their Regents.",
} as const;

/** Price in cents for each session length in minutes. */
export const pricing = {
  30: 4000,
  60: 6000,
} as const;

export type SessionLength = keyof typeof pricing;
export const sessionLengths = [30, 60] as const satisfies readonly SessionLength[];

export type BookingRules = {
  /** Earliest session start, minutes after local midnight. */
  earliestStartMinute: number;
  /** Latest session end, minutes after local midnight. */
  latestEndMinute: number;
  /** Start times are offered on this grid, in minutes. */
  slotStepMinutes: number;
  /** How far ahead students can book, in days. */
  daysAhead: number;
  /** Minimum notice before a session can be requested, in hours. */
  minLeadHours: number;
  /** How many preferred times a student can pick. */
  maxPreferences: number;
  /** After a tutor claims a request, the slot is held this many hours for payment. */
  holdHours: number;
  /** The hold always ends this many minutes before the session starts. */
  holdEndsBeforeStartMinutes: number;
  /** Free cancel or reschedule up to this many hours before. */
  freeCancelHours: number;
  /** Whether Saturday and Sunday sessions are offered. */
  allowWeekends: boolean;
};

export const bookingRules: BookingRules = {
  earliestStartMinute: 15 * 60 + 30, // 3:30 PM
  latestEndMinute: 21 * 60, // 9:00 PM
  slotStepMinutes: 30,
  daysAhead: 21,
  minLeadHours: 6,
  maxPreferences: 3,
  holdHours: 24,
  holdEndsBeforeStartMinutes: 60,
  freeCancelHours: 12,
  allowWeekends: false, // open decision
};

export const payout = {
  /** How often the pot is split 4 ways. "week" or "month". */
  period: "month" as "week" | "month",
};
