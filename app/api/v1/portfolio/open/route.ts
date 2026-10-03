import { apiSetupView, json, requireApiAgency, route } from "@/lib/api/v1";
import { openSetup } from "@/lib/data/portfolio-setup";

export const dynamic = "force-dynamic";

/** POST /api/v1/portfolio/open: opens (or resumes) the draft and returns it. */
export const POST = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  return json({ setup: apiSetupView(await openSetup(auth.agency.id, auth.user.id)) }, { status: 201 });
});
