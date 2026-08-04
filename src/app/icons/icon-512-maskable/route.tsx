import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171717",
          color: "#fafafa",
          fontSize: 168,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        CH
      </div>
    ),
    { width: 512, height: 512 }
  );
}
