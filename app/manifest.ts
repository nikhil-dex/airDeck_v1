import type { MetadataRoute } from "next";

// Makes PPTgen installable (Add to Home Screen). Launched from the home
// screen it runs standalone - no browser address bar - which is the only
// way to get a true fullscreen presentation on iOS.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PPTgen",
    short_name: "PPTgen",
    description:
      "AI-designed presentations engineers edit as code - present from any device.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
