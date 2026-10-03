import { apiSetupView, bearerUser, fail, json, route } from "@/lib/api/v1";
import { getAgencyByOwner, toSummary } from "@/lib/data/agencies";
import { getSetup } from "@/lib/data/portfolio-setup";
import { publicationFor } from "@/lib/data/publication";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/me → { user, agency, setup }. The agency carries the public summary plus the owner's own
 * contact fields and visibility; the setup is the resumable draft (step, version, data, media) or null.
 * Never another account's e-mail, password hash, second-factor or invitation data.
 */
export const GET = route(async (request) => {
  const bearer = await bearerUser(request);
  if (!bearer) return fail("unauthenticated");
  const { user } = bearer;
  const agency = await getAgencyByOwner(user.id);
  const [setup, publication] = agency ? await Promise.all([getSetup(agency.id), publicationFor(agency.id)]) : [null, null];
  return json({
    user: { id: user.id, email: user.email, role: user.role, mfaEnabled: user.mfaEnabled },
    agency: agency
      ? {
          ...toSummary(agency),
          bio: agency.bio,
          services: agency.services,
          pendingServices: agency.pendingServices,
          email: agency.email,
          whatsapp: agency.whatsapp,
          phone: agency.phone,
          website: agency.website,
          postCount: agency.postCount,
          status: agency.status,
          visibility: publication!.visibility,
        }
      : null,
    setup: apiSetupView(setup),
  });
});
