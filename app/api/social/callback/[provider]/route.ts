import { getSessionUser, currentSessionId } from "@/lib/auth/session";
import { audit } from "@/lib/data/agencies";
import { completeAttempt, consumeAttempt } from "@/lib/data/social";
import { isSocialProvider } from "@/lib/social/providers";

// The platform sends the person back here after its consent screen (docs/53).
// The state is taken once and must belong to this browser session and user;
// the code is exchanged server-side; the person then confirms which of the
// listed channels, Pages or accounts to use. Nothing is published here.
export const dynamic = "force-dynamic";

const back = (request: Request, locale: string, returnTo: string, query: Record<string, string>) => {
  const path = returnTo === "setup" ? `/${locale}/portfolio-setup` : `/${locale}/studio/connections`;
  const url = new URL(path, request.url);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return Response.redirect(url, 303);
};

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isSocialProvider(provider)) return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const user = await getSessionUser();
  const attempt = await consumeAttempt(provider, state, await currentSessionId(), user?.id ?? null);
  // A stale, replayed or foreign callback changes nothing and goes back to the studio.
  if ("error" in attempt) return back(request, "ar", "connections", { social: attempt.error });
  // The person cancelled or declined on the platform's screen.
  if (url.searchParams.get("error") || !url.searchParams.get("code")) {
    return back(request, attempt.locale, attempt.returnTo, { social: "denied", provider });
  }
  const result = await completeAttempt(attempt, url.searchParams.get("code")!.slice(0, 2000));
  if ("error" in result) {
    await audit(attempt.userId, "social.connect_failed", "agency", attempt.agencyId, { provider, reason: result.error });
    return back(request, attempt.locale, attempt.returnTo, { social: result.error, provider });
  }
  await audit(attempt.userId, "social.connect", "agency", attempt.agencyId, { provider, limited: result.limited, ownership: attempt.ownership });
  return back(request, attempt.locale, attempt.returnTo, { social: result.limited ? "limited" : "choose", grant: result.grantId });
}
