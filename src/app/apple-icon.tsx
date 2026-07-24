import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/constants/site";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const alt = SITE_NAME;

// iOS rasterises the home-screen icon itself and ignores SVGs, so the mark in
// icon.svg — three marker strokes over aubergine, the middle one highlighted —
// is rebuilt here at the size Apple asks for.
export default function AppleIcon() {
  const bar = (width: number, color: string) => (
    <div
      style={{
        width: `${width}px`,
        height: "14px",
        borderRadius: "7px",
        backgroundColor: color,
      }}
    />
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "15px",
          padding: "0 39px",
          backgroundColor: "#4a154b",
        }}
      >
        {bar(101, "#ffffff")}
        {bar(101, "#ffdb4d")}
        {bar(62, "#ffffff")}
      </div>
    ),
    size,
  );
}
