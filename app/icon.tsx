import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: "96px",
          border: "20px solid #dfe4ea",
          color: "#181c22",
          fontSize: 120,
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
