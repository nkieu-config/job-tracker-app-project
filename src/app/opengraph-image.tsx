import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Applywise — the AI reads the posting with you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#4a154b",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "20px",
              backgroundColor: "#ffffff",
              color: "#4a154b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "56px",
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ fontSize: "52px", fontWeight: 700 }}>Applywise</div>
        </div>
        <div
          style={{
            marginTop: "56px",
            fontSize: "68px",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-1px",
            maxWidth: "980px",
          }}
        >
          Every job posting, marked up against your resume.
        </div>
        <div style={{ display: "flex", gap: "16px", marginTop: "44px" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "#ffdb4d",
              color: "#221a26",
              fontSize: "30px",
              fontWeight: 600,
              padding: "10px 22px",
              borderRadius: "6px",
            }}
          >
            React
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#ffdb4d",
              color: "#221a26",
              fontSize: "30px",
              fontWeight: 600,
              padding: "10px 22px",
              borderRadius: "6px",
            }}
          >
            TypeScript
          </div>
          <div
            style={{
              display: "flex",
              color: "#ffb4a2",
              fontSize: "30px",
              fontWeight: 600,
              padding: "10px 22px",
              borderRadius: "6px",
              borderBottom: "5px solid #ffb4a2",
            }}
          >
            WebGL
          </div>
        </div>
        <div
          style={{
            marginTop: "40px",
            fontSize: "30px",
            color: "#d9bdde",
            maxWidth: "900px",
          }}
        >
          Matched skills highlighted · gaps underlined · every model output
          measured by a six-suite eval harness
        </div>
      </div>
    ),
    size,
  );
}
