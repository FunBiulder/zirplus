import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zirplus",
    short_name: "Zirplus",
    description: "Swap tokenized stocks on Robinhood Chain at prices anchored to the live mid.",
    start_url: "/",
    display: "standalone",
    background_color: "#222224",
    theme_color: "#222224",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
