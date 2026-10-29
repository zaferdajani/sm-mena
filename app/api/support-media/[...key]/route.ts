import { getSessionUser } from "@/lib/auth/session";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { authorizeStaff } from "@/lib/core/rules/auth/authorize";
import { isSafeKey, storage } from "@/lib/storage";
import { supportMediaType } from "@/lib/support-media";
import { threadByToken } from "@/lib/data/support-threads";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", "X-Robots-Tag": "noindex", "X-Content-Type-Options": "nosniff" };

/**
 * Screenshots, voice notes and screen recordings attached to problem reports
 * (docs/61): private storage, staff with support.manage, or the reporter with
 * their conversation link (docs/63). Answers range
 * requests so Safari can play audio and video.
 */
/** The reporter sees the files of their own conversation (docs/63): the token must belong to the report that holds this key. */
async function reporterOwns(key: string, token: string | null) {
  if (!token) return false;
  const thread = await threadByToken(token);
  if (!thread) return false;
  const keys = [thread.request, ...thread.messages].flatMap((m) => [...m.screenshots, ...m.attachments.map((a) => a.key)]);
  return keys.includes(key);
}

export async function GET(request: Request, { params }: RouteContext<"/api/support-media/[...key]">) {
  const key = (await params).key.join("/");
  const allowed = authorizeStaff(await getSessionUser(), adminMfaRequired(), "support.manage", { allowEnroll: false }).ok || (await reporterOwns(key, new URL(request.url).searchParams.get("t")));
  const type = supportMediaType(key);
  if (!allowed || !type || !/^support\/[a-f0-9-]{36}\.(webp|webm|mp4|mp3|ogg|wav)$/.test(key) || !isSafeKey(key)) return new Response("Not found", { status: 404, headers: privateHeaders });
  const body = await storage().get(key);
  if (!body) return new Response("Not found", { status: 404, headers: privateHeaders });
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = body.byteLength;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { ...privateHeaders, "Content-Range": `bytes */${size}` } });
    return new Response(new Uint8Array(body.subarray(start, end + 1)), {
      status: 206,
      headers: { ...privateHeaders, "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(body), { headers: { ...privateHeaders, "Content-Type": type, "Accept-Ranges": "bytes" } });
}
