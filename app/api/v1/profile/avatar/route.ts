import { apiSetupView, fail, json, requireApiAgency, route, setupFailure } from "@/lib/api/v1";
import { MAX_UPLOAD_BYTES } from "@/lib/core/catalog/media-limits";
import { getSetup, patchProfile } from "@/lib/data/portfolio-setup";
import { setupVersionSchema } from "@/lib/validation/portfolio-setup";

export const dynamic = "force-dynamic";

/** POST /api/v1/profile/avatar (multipart: avatar, version): replaces the profile picture. */
export const POST = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const form = await request.formData().catch(() => null);
  const file = form?.get("avatar");
  const version = setupVersionSchema.safeParse(form?.get("version"));
  if (!form || !(file instanceof File) || file.size === 0 || !version.success) return fail("invalid", { reason: "avatar" });
  if (file.size > MAX_UPLOAD_BYTES) return fail("invalid", { reason: "too_large" });
  const result = await patchProfile(auth.agency, { avatar: Buffer.from(await file.arrayBuffer()) }, { version: version.data, userId: auth.user.id });
  if ("error" in result) return setupFailure(result.error);
  return json({ changed: result.changed, setup: apiSetupView(await getSetup(auth.agency.id)) });
});
