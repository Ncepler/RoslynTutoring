import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "./ics";

describe("buildIcs", () => {
  const ics = buildIcs(
    {
      uid: "booking-123@tutoring",
      start: new Date("2026-11-05T21:30:00Z"),
      end: new Date("2026-11-05T22:30:00Z"),
      summary: "Geometry review, with Noah",
      description: "Bring your notes.\nZoom: https://zoom.us/j/123",
      location: "https://zoom.us/j/123",
      now: new Date("2026-11-01T12:00:00Z"),
    },
    "Tutoring",
  );

  it("uses UTC timestamps", () => {
    expect(ics).toContain("DTSTART:20261105T213000Z");
    expect(ics).toContain("DTEND:20261105T223000Z");
    expect(ics).toContain("DTSTAMP:20261101T120000Z");
  });

  it("escapes commas and newlines", () => {
    expect(ics).toContain("SUMMARY:Geometry review\\, with Noah");
    expect(ics).toContain("Bring your notes.\\nZoom");
  });

  it("uses CRLF line endings and closes every block", () => {
    expect(ics.split("\r\n").filter((l) => l.startsWith("BEGIN:")).length).toBe(3);
    expect(ics.split("\r\n").filter((l) => l.startsWith("END:")).length).toBe(3);
    expect(ics.endsWith("\r\n")).toBe(true);
  });
});

describe("escapeText", () => {
  it("escapes backslashes and semicolons", () => {
    expect(escapeText("a\\b;c")).toBe("a\\\\b\\;c");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("folds long lines to 75 octets", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"x".repeat(200)}`);
  });
});
