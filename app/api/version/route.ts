import { releaseInfo } from "@/lib/release";

export const dynamic = "force-dynamic";

/** Release identity only; no credentials, infrastructure details or user data. */
export function GET() {
  return Response.json(releaseInfo(), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Vercel-CDN-Cache-Control": "no-store",
    },
  });
}
