import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { providerId } from "@/lib/social/http";

/**
 * Meta's signed_request (deauthorize and data-deletion callbacks): the payload
 * is trusted only when its HMAC-SHA256 with this app's secret matches, and it
 * names the app-scoped user id. Returns that id, or null.
 */
export function verifySignedRequest(signedRequest: string, appSecret: string): string | null {
  if (!signedRequest || signedRequest.length > 4000 || !appSecret) return null;
  const [sig, payload] = signedRequest.split(".", 2);
  if (!sig || !payload) return null;
  const expected = createHmac("sha256", appSecret).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (String(data.algorithm ?? "").toUpperCase() !== "HMAC-SHA256") return null;
    return providerId(typeof data.user_id === "number" ? String(data.user_id) : data.user_id);
  } catch {
    return null;
  }
}
