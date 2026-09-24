import type { MetadataRoute } from "next";

// Lets phones "add to home screen" with an app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سوّق · Sawwiq",
    short_name: "سوّق",
    description: "شركات التسويق والسوشيال ميديا في الأردن · Social media and marketing agencies in Jordan",
    start_url: "/ar",
    display: "standalone",
    background_color: "#f2f2ed",
    theme_color: "#0e6b46",
    lang: "ar",
    dir: "rtl",
    shortcuts: [
      { name: "وظّف وكالة", short_name: "وظّف", url: "/ar/hire" },
      { name: "المساعد الذكي", short_name: "المساعد", url: "/ar/match" },
      { name: "استكشف", short_name: "استكشف", url: "/ar/explore" },
    ],
    icons: [
      { src: "/brand/mark-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/mark-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
