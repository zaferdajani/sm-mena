import type { MetadataRoute } from "next";

// Lets phones "add to home screen" with an app-like window.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "سوّق · Sawwiq",
    short_name: "سوّق",
    description: "وكالات السوشيال ميديا في الأردن · Social media agencies in Jordan",
    start_url: "/ar",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#13784a",
    lang: "ar",
    dir: "rtl",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
