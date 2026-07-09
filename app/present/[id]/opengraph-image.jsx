import { ImageResponse } from "next/og";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import Ppts from "@/models/Ppts";

// Branded unfurl card for shared /present/ links (WhatsApp, Slack, Discord…).
// Rendered per deck with its title on the aurora/glass brand look.

export const runtime = "nodejs";
export const alt = "PPTgen presentation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }) {
  const { id } = await params;

  let title = "AI-designed presentation";
  try {
    if (mongoose.Types.ObjectId.isValid(id)) {
      await dbConnect();
      const ppt = await Ppts.findById(id).select("titles").lean();
      if (ppt?.titles) title = ppt.titles;
    }
  } catch {
    // fall back to the generic title — the card must always render
  }
  if (title.length > 80) title = `${title.slice(0, 77)}...`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          backgroundColor: "#070709",
          color: "#e8e6f0",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* aurora glow blobs */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 600,
            height: 500,
            background: "radial-gradient(circle, rgba(179,255,200,0.28) 0%, rgba(179,255,200,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            right: -160,
            width: 560,
            height: 560,
            background: "radial-gradient(circle, rgba(255,110,247,0.25) 0%, rgba(255,110,247,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: 320,
            width: 640,
            height: 520,
            background: "radial-gradient(circle, rgba(94,173,255,0.28) 0%, rgba(94,173,255,0) 70%)",
          }}
        />

        {/* brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "linear-gradient(135deg, #5eadff, #ff6ef7)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: "#ffffff" }}>
            PPTgen
          </div>
        </div>

        {/* deck title */}
        <div
          style={{
            display: "flex",
            fontSize: title.length > 40 ? 56 : 72,
            fontWeight: 800,
            lineHeight: 1.15,
            color: "#ffffff",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        {/* footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              width: 340,
              height: 6,
              borderRadius: 3,
              background: "linear-gradient(90deg, #b3ffc8, #5eadff, #ff6ef7)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: 26, color: "rgba(232,230,240,0.55)" }}>
            A live presentation — animations included. Press play in your browser.
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
