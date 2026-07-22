import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Margin — the AI reads the posting with you";
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
          backgroundColor: "#f9f7f1",
          color: "#26231d",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "20px",
              backgroundColor: "#2b2721",
              color: "#fbf9f3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "56px",
              fontWeight: 700,
            }}
          >
            M
          </div>
          <div style={{ fontSize: "52px", fontWeight: 700 }}>Margin</div>
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
              color: "#26231d",
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
              color: "#26231d",
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
              color: "#b0392c",
              fontSize: "30px",
              fontWeight: 600,
              padding: "10px 22px",
              borderRadius: "6px",
              borderBottom: "5px solid #b0392c",
            }}
          >
            WebGL
          </div>
        </div>
        <div
          style={{
            marginTop: "40px",
            fontSize: "30px",
            color: "#7a7264",
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
