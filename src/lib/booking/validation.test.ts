import { describe, expect, it } from "vitest";
import { bookingRequestSchema, fieldErrors, reportSchema } from "./validation";

const valid = {
  subjectId: "geometry-id",
  level: "honors",
  durationMinutes: 60,
  preferences: ["2026-11-02T20:30:00.000Z", "2026-11-03T21:00:00.000Z"],
  testId: null,
  student: { firstName: " Sam ", lastName: "Lee", grade: 9, email: "Sam@Example.com" },
  parent: { name: "Pat Lee", email: "pat@example.com" },
  consent: true,
};

describe("bookingRequestSchema", () => {
  it("accepts a complete request and normalizes it", () => {
    const r = bookingRequestSchema.parse(valid);
    expect(r.student.firstName).toBe("Sam");
    expect(r.student.email).toBe("sam@example.com");
  });

  it("requires parent consent", () => {
    const r = bookingRequestSchema.safeParse({ ...valid, consent: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).consent).toMatch(/parent or guardian/i);
  });

  it("only allows grades we tutor", () => {
    const r = bookingRequestSchema.safeParse({ ...valid, student: { ...valid.student, grade: 11 } });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)["student.grade"]).toMatch(/grades 8 to 10/);
  });

  it("only allows 30 or 60 minute sessions", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, durationMinutes: 45 }).success).toBe(false);
  });

  it("needs one to three different preferred times", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, preferences: [] }).success).toBe(false);
    const four = ["2026-11-02T20:30:00Z", "2026-11-02T21:00:00Z", "2026-11-02T21:30:00Z", "2026-11-02T22:00:00Z"];
    expect(bookingRequestSchema.safeParse({ ...valid, preferences: four }).success).toBe(false);
    const dupes = ["2026-11-02T20:30:00Z", "2026-11-02T15:30:00-05:00"];
    expect(bookingRequestSchema.safeParse({ ...valid, preferences: dupes }).success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const r = bookingRequestSchema.safeParse({ ...valid, parent: { ...valid.parent, email: "nope" } });
    expect(r.success).toBe(false);
  });

  it("rejects bots that fill the honeypot", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, website: "spam.example" }).success).toBe(false);
  });
});

describe("reportSchema", () => {
  it("allows anonymous reports", () => {
    const r = reportSchema.parse({ message: "The pay button did nothing on my phone." });
    expect(r.email).toBe("");
    expect(r.topic).toBe("other");
  });

  it("needs a real message", () => {
    expect(reportSchema.safeParse({ message: "hi" }).success).toBe(false);
  });
});
