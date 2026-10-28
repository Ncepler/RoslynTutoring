import { ImageResponse } from "next/og";
import { pricing, site } from "@/config/site";
import { formatPrice } from "@/lib/booking/policy";

export const alt = `${site.name}: one-on-one pre-test review for ${site.school} students`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Type-only share card: white, navy type, one blue accent. No photos, no gradients. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#ffffff",
          borderTop: "12px solid #0f172a",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 22, height: 22, background: "#0369a1" }} />
          <span>{site.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Test coming up?</div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1, color: "#475569" }}>
            {`Review with a ${site.school} student.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 30, color: "#334155" }}>
          <span>One-on-one on Zoom</span>
          <span style={{ color: "#0369a1" }}>·</span>
          <span>{`Grades ${site.grades[0]} to ${site.grades[site.grades.length - 1]}`}</span>
          <span style={{ color: "#0369a1" }}>·</span>
          <span>{`${formatPrice(pricing[30])} for 30 minutes`}</span>
        </div>
      </div>
    ),
    size,
  );
}
