import { isSafeKey, storage } from "@/lib/storage";

// Serves locally stored uploads (STORAGE_PROVIDER=local). Keys are random
// UUIDs, so responses are immutable and cached for a year.
export async function GET(_: Request, { params }: RouteContext<"/media/[...key]">) {
  const key = (await params).key.join("/");
  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });
  const body = await storage().get(key);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": key.endsWith(".png") ? "image/png" : key.endsWith(".jpg") ? "image/jpeg" : "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
