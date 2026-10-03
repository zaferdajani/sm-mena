import { apiSetupView, invalidBody, json, readJson, requireApiAgency, route, setupFailure } from "@/lib/api/v1";
import { getSetup, patchProfile } from "@/lib/data/portfolio-setup";
import { resolveServices } from "@/lib/services/tags";
import { apiProfilePatchSchema } from "@/lib/validation/api-v1";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/profile { version, name?, bio?, services?, newServices? }: the setup step-1 rules. Only the
 * fields given change; a non-empty services list replaces the saved one, typed services wait for review.
 */
export const PATCH = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const parsed = apiProfilePatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const { agency, user } = auth;
  const input = parsed.data;
  const picked = input.services || input.newServices ? await resolveServices(agency.id, input.services ?? [], input.newServices ?? []) : null;
  if (picked && !picked.services.length && !picked.pending.length && (input.services?.length || input.newServices?.length)) return setupFailure("noServices");
  const result = await patchProfile(
    agency,
    {
      name: input.name,
      bio: input.bio,
      services: picked?.services.length ? picked.services : undefined,
      pendingServices: picked?.pending.length ? [...new Set([...agency.pendingServices, ...picked.pending])] : undefined,
    },
    { version: input.version, userId: user.id },
  );
  if ("error" in result) return setupFailure(result.error);
  return json({ changed: result.changed, setup: apiSetupView(await getSetup(agency.id)) });
});
