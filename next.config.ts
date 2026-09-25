import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
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
