import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: "42px",
          border: "8px solid #dfe4ea",
          color: "#181c22",
          fontSize: 52,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif",
        }}
      >
        CG
      </div>
    ),
    size,
  );
}
