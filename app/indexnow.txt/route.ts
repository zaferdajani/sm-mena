// IndexNow key file (lib/indexnow.ts): proves this site owns the key.
export function GET() {
  const key = process.env.INDEXNOW_KEY;
  return key ? new Response(key, { headers: { "content-type": "text/plain; charset=utf-8" } }) : new Response("", { status: 404 });
}
