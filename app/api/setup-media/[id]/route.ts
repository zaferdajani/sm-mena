import { getCurrentAgency } from "@/lib/auth/session";
import { readSetupMedia } from "@/lib/data/portfolio-setup";

// A setup image staged before publishing (docs/53): private storage, shown only
// to the agency that uploaded it, never cached by shared caches.
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const agency = await getCurrentAgency();
  if (!agency) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const body = await readSetupMedia(agency.id, id);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), { headers: { "content-type": "image/webp", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
