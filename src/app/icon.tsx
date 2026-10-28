import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Placeholder mark until there's a logo: the wordmark's blue square. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0369a1" }}>
        <div style={{ width: 22, height: 22, background: "#ffffff" }} />
      </div>
    ),
    size,
  );
}
