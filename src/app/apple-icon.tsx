import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0369a1" }}>
        <div style={{ width: 60, height: 60, background: "#ffffff" }} />
      </div>
    ),
    size,
  );
}
