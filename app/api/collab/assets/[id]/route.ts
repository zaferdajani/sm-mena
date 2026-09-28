import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgency } from "@/lib/auth/session";
import { assetForDownload } from "@/lib/data/work-orders";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** A work-order file, only for the buyer or the supplier of that work order (docs/49). Never cached across users. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/collab/assets/[id]">) {
  const { id } = await ctx.params;
  if (!rateLimit(`collab-asset:${await clientIp()}`, 300, 10 * 60 * 1000)) return new NextResponse("Too many requests", { status: 429 });
  const agency = await getCurrentAgency();
  if (!agency) return new NextResponse("Not found", { status: 404 });
  const file = await assetForDownload(agency.id, id, req.nextUrl.searchParams.get("v") === "thumb");
  if (!file) return new NextResponse("Not found", { status: 404 });
  const type = TYPES[file.key.split(".").pop() ?? ""] ?? "application/octet-stream";
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "content-type": type,
      "content-disposition": `inline; filename="file.${file.key.split(".").pop()}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow",
      "referrer-policy": "no-referrer",
    },
  });
}
