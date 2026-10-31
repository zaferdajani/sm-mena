import { NextResponse } from "next/server";
import { addSetupMedia, getSetup, openSetup, restartSetup } from "@/lib/data/portfolio-setup";
import { recordFunnel } from "@/lib/data/funnel";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";

// "Share → Sawwiq" from Photos or WhatsApp (the installed app's share target, app/manifest.ts; docs/65. Under /api so the
// locale proxy leaves the POST alone;
// stage 7). The phone posts the pictures here; they are staged privately in the first-run setup draft
// and the person lands on the one-screen setup with them already in place. Nothing is published.
export const dynamic = "force-dynamic";

const MAX_FILES = 10;

export async function POST(request: Request) {
  if (!rateLimit(`share-target:${await clientIp()}`, 30, 60 * 60 * 1000)) return new Response("Too many requests", { status: 429 });
  const user = await getSessionUser();
  const agency = user ? await getCurrentAgency() : null;
  const origin = new URL(request.url).origin;
  // Not signed in as a provider: sign in first, then come back to the setup screen.
  if (!user || !agency) return NextResponse.redirect(`${origin}/ar/login?next=/portfolio-setup`, 303);
  const lang = agency.contentLang === "en" ? "en" : "ar";
  const form = await request.formData().catch(() => null);
  const files = form ? form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith("image/")).slice(0, MAX_FILES) : [];
  let view = (await getSetup(agency.id)) ?? (await openSetup(agency.id, user.id));
  if (view.status === "finished") {
    await restartSetup(agency.id, user.id);
    view = await openSetup(agency.id, user.id);
  }
  if (files.length) {
    const before = view.media.length;
    const result = await addSetupMedia(agency.id, await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer()))), "upload");
    if (!("error" in result) && before === 0) await recordFunnel("first_photo_uploaded", agency.id);
  }
  return NextResponse.redirect(`${origin}/${lang}/portfolio-setup?shared=${files.length}`, 303);
}
