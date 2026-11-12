import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// The Content-Security-Policy (QA M-03). Scripts, styles, fonts and requests come from this site only;
// Next.js still needs inline scripts and styles. Photos, videos and embeds (YouTube, TikTok, app demos)
// come from https hosts. No plugins, no <base> rewrites, no framing by other sites, and forms post only
// here or over https (a payment partner's checkout). HSTS already keeps every request on https.
// `next dev` (hot reload) needs eval and a websocket; production builds need neither.
const DEV = process.env.NODE_ENV === "development";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${DEV ? " ws: wss:" : ""}`,
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https:",
  "frame-ancestors 'self'",
].join("; ");

// Hardening headers on every response (QA M-03, L-06). The framing rule is set two ways for old and new browsers.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: CSP },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Voice notes (microphone), photos (camera), "use my location" and the payment sheet stay available to our own pages only.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self), usb=(), serial=(), hid=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // No "x-powered-by: Next.js" banner (QA L-05).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    // Browsers still ask for /favicon.ico; serve the app icon instead of a 404 page (QA L-04).
    return { beforeFiles: [{ source: "/favicon.ico", destination: "/icon.png" }], afterFiles: [], fallback: [] };
  },
  // PGlite loads WebAssembly files next to its module; sharp is native;
  // jspdf must resolve its Node build (and stay out of client bundles).
  serverExternalPackages: ["@electric-sql/pglite", "sharp", "jspdf"],
  // Serverless hosts (Vercel) ship only traced files: the contract/NDA PDF
  // route reads the Arabic font from public/fonts at run time.
  outputFileTracingIncludes: {
    "/api/legal/[kind]/[ref]": ["./public/fonts/**/*"],
    "/api/receipts/[ref]/[entry]": ["./public/fonts/**/*"],
  },
  // A second local server (e.g. an isolated test server) can build into its own folder.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  experimental: {
    // Post uploads carry up to 10 images of 10 MB.
    serverActions: { bodySizeLimit: "60mb" },
  },
  images: {
    remotePatterns: process.env.SUPABASE_URL
      ? [{ protocol: "https", hostname: new URL(process.env.SUPABASE_URL).hostname }]
      : [],
  },
};

export default withNextIntl(nextConfig);
