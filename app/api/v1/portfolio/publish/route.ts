import { apiSetupView, invalidBody, json, readJson, requireApiAgency, route, setupFailure } from "@/lib/api/v1";
import { contentLang } from "@/lib/content-lang";
import { getSetup, publishSetup } from "@/lib/data/portfolio-setup";
import { canCreatePost, entitlementsFor } from "@/lib/monetization/entitlements";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { apiPublishSchema } from "@/lib/validation/api-v1";

export const dynamic = "force-dynamic";

/** The label a personal project gets in the agency's content language, read from the catalogs without next-intl. */
const personalLabel = (lang: "ar" | "en") => (lang === "en" ? en : ar).Setup.client.personalLabel;

/** POST /api/v1/portfolio/publish { version, rights }: the owner's explicit publish, once per draft. */
export const POST = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const parsed = apiPublishSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const { agency, user } = auth;
  const existing = await getSetup(agency.id);
  if (!existing?.postId && !canCreatePost(entitlementsFor(agency), agency.postCount)) return setupFailure("limit");
  const result = await publishSetup({ agencyId: agency.id, userId: user.id, version: parsed.data.version, rights: parsed.data.rights === true, personalLabel: personalLabel(contentLang(agency.contentLang)) });
  if ("error" in result) return setupFailure(result.error);
  return json({ postId: result.postId, setup: apiSetupView(await getSetup(agency.id)) }, { status: 201 });
});
