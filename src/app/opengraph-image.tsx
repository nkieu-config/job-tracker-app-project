import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Job Tracker — AI-powered job application tracking";
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
          backgroundImage:
            "radial-gradient(at 100% 0%, rgba(233, 216, 255, 0.25) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(255, 240, 230, 0.15) 0px, transparent 50%)",
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
            J
          </div>
          <div style={{ fontSize: "52px", fontWeight: 700 }}>Job Tracker</div>
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
          Track your applications. Land your dream job.
        </div>
        <div
          style={{
            marginTop: "32px",
            fontSize: "32px",
            color: "#d9bdde",
            maxWidth: "900px",
          }}
        >
          AI-powered JD analysis · Resume fit scoring · Streaming bullet
          tailoring
        </div>
      </div>
    ),
    size,
  );
}
