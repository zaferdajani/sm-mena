import { apiSetupView, json, requireApiAgency, route } from "@/lib/api/v1";
import { openSetup, restartSetup } from "@/lib/data/portfolio-setup";

export const dynamic = "force-dynamic";

/** POST /api/v1/portfolio/restart: "add another project", a fresh draft through the same steps. */
export const POST = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  await restartSetup(auth.agency.id, auth.user.id);
  return json({ setup: apiSetupView(await openSetup(auth.agency.id, auth.user.id)) }, { status: 201 });
});
