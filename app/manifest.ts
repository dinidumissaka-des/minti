import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minti",
    short_name: "Minti",
    description: "Personal expense tracker",
    theme_color: BRAND.backgroundDark,
    background_color: BRAND.backgroundDark,
    start_url: "/",
    display: "standalone",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
  };
}
