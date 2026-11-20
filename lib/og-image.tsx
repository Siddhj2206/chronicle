import { ImageResponse } from "next/og";

export function socialImage(title: string, author: string): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "56px 64px",
        background: "#f6f7f9",
        color: "#111315",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", fontSize: 44, color: "#ba1b09" }}>
        Chronicle
      </div>
      <div
        style={{
          display: "flex",
          fontSize: title.length > 100 ? 48 : 64,
          lineHeight: 1.12,
          letterSpacing: "-1px",
          lineClamp: 4,
          overflow: "hidden",
          wordBreak: "break-word",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", fontSize: 28, color: "#53565a" }}>
        {author}
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "no-store" } },
  );
}
