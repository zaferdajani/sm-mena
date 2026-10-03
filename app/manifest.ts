import type { MetadataRoute } from "next";
import { isRegistrationPhase } from "@/lib/launch-phase";

// Lets phones "add to home screen" with an app-like window. During the registration phase the
// shortcuts point at what is open (join, examples); the marketplace shortcuts would only redirect to /soon.
export default function manifest(): MetadataRoute.Manifest {
  const registration = isRegistrationPhase();
  return {
    id: "/ar",
    scope: "/",
    name: "سوّق · Sawwiq",
    short_name: "سوّق",
    description: "شركات التسويق والسوشيال ميديا في الأردن · Social media and marketing agencies in Jordan",
    start_url: "/ar",
    display: "standalone",
    background_color: "#f2f2ed",
    theme_color: "#0e6b46",
    lang: "ar",
    dir: "rtl",
    shortcuts: registration
      ? [
          { name: "انضم للدفعة الأولى", short_name: "انضم", url: "/ar/join" },
          { name: "نموذج الصفحة", short_name: "النموذج", url: "/ar/examples" },
        ]
      : [
          { name: "وظّف وكالة", short_name: "وظّف", url: "/ar/hire" },
          { name: "المساعد الذكي", short_name: "المساعد", url: "/ar/match" },
          { name: "استكشف", short_name: "استكشف", url: "/ar/explore" },
        ],
    icons: [
      { src: "/brand/mark-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/mark-512.png", sizes: "512x512", type: "image/png" },
      // Maskable: the mark on its own green, with the safe zone Android and iOS crop into.
      { src: "/brand/mark-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
