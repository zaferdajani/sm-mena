import { isSafeKey, storage } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };

// Serves locally stored uploads (STORAGE_PROVIDER=local). Keys are random
// UUIDs, so responses are immutable and cached for a year. Videos (interface
// backgrounds) answer range requests, which Safari needs to play them.
export async function GET(req: Request, { params }: RouteContext<"/media/[...key]">) {
  const key = (await params).key.join("/");
  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });
  const body = await storage().get(key);
  if (!body) return new Response("Not found", { status: 404 });
  const type = TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && type.startsWith("video/")) {
    const size = body.byteLength;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(new Uint8Array(body.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(body), { headers });
}
