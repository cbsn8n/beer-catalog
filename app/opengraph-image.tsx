import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Beervana — каталог пива";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 45%, #fef3c7 100%)",
          padding: "56px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontSize: 64, lineHeight: 1 }}>🍺</div>
          <div style={{ fontSize: 54, fontWeight: 800, color: "#7c2d12" }}>Beervana</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: "#9a3412" }}>
            База пива от Ивана
          </div>
          <div style={{ fontSize: 30, color: "#78350f", maxWidth: "90%" }}>
            Каталог пива с фото, рейтингами и фильтрами по стране, сорту и цене.
          </div>
        </div>

        <div style={{ fontSize: 28, color: "#92400e", fontWeight: 600 }}>vana.beer</div>
      </div>
    ),
    {
      ...size,
    }
  );
}
