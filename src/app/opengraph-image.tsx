import { ImageResponse } from "next/og";
import { pricing, site } from "@/config/site";
import { formatPrice } from "@/lib/booking/policy";

export const alt = `${site.name}: one-on-one pre-test review for ${site.school} students`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Type-only share card. No photos, same as the site. */
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
          backgroundImage:
            "linear-gradient(rgba(11,21,38,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11,21,38,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          color: "#0b1526",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 22, height: 22, borderRadius: 5, background: "#1a56f0" }} />
          <span>{site.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>Test coming up?</div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1, color: "#5f6b7e" }}>
            {`Review with a ${site.school} student.`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 30, color: "#364154" }}>
          <span>One-on-one on Zoom</span>
          <span style={{ color: "#1a56f0" }}>·</span>
          <span>{`Grades ${site.grades[0]} to ${site.grades[site.grades.length - 1]}`}</span>
          <span style={{ color: "#1a56f0" }}>·</span>
          <span>{`${formatPrice(pricing[30])} for 30 minutes`}</span>
        </div>
      </div>
    ),
    size,
  );
}
