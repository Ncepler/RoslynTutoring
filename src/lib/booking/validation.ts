import { z } from "zod";
import { bookingRules, site } from "@/config/site";

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(80, `${label} is too long`);

const email = z
  .email("Enter a valid email")
  .trim()
  .max(254)
  .transform((v) => v.toLowerCase());

const id = z.string().trim().min(1).max(64);

export const bookingRequestSchema = z.object({
  subjectId: id,
  level: z.enum(["regular", "honors"]),
  durationMinutes: z.union([z.literal(30), z.literal(60)]),
  preferences: z
    .array(z.iso.datetime({ offset: true }))
    .min(1, "Pick at least one time")
    .max(bookingRules.maxPreferences, `Pick up to ${bookingRules.maxPreferences} times`)
    .refine((list) => new Set(list.map((d) => new Date(d).getTime())).size === list.length, {
      message: "Each preferred time should be different",
    }),
  testId: id.nullish(),
  student: z.object({
    firstName: name("First name"),
    lastName: name("Last name"),
    grade: z
      .number()
      .int()
      .refine((g) => (site.grades as readonly number[]).includes(g), {
        message: `We tutor grades ${site.grades[0]} to ${site.grades[site.grades.length - 1]}`,
      }),
    email,
  }),
  parent: z.object({
    name: z.string().trim().min(1, "Parent or guardian name is required").max(160),
    email,
  }),
  consent: z.literal(true, { error: "A parent or guardian needs to agree before booking" }),
  /** Honeypot. Real people never see or fill this field. */
  website: z.string().max(0).optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const reportSchema = z.object({
  name: z.string().trim().max(160).optional().default(""),
  email: z.union([email, z.literal("")]).optional().default(""),
  topic: z.enum(["booking", "payment", "session", "safety", "website", "other"]).default("other"),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(4000),
  page: z.string().trim().max(300).optional().default(""),
  website: z.string().max(0).optional(),
});

export type ReportInput = z.infer<typeof reportSchema>;

/** Flattens zod issues into { "student.email": "Enter a valid email" }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
