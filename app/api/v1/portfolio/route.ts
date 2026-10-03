import { apiSetupView, invalidBody, json, readJson, requireApiAgency, route, setupFailure } from "@/lib/api/v1";
import { isServiceKey } from "@/lib/core/catalog/taxonomy";
import { featureOpen } from "@/lib/features";
import { addClientOnce, getSetup, ownedClientId, writeSetup, type SetupError, type SetupView } from "@/lib/data/portfolio-setup";
import { rateLimit } from "@/lib/rate-limit";
import { apiPortfolioPatchSchema } from "@/lib/validation/api-v1";

export const dynamic = "force-dynamic";

const answer = async (agencyId: string, result: SetupView | { error: SetupError }) =>
  "error" in result ? setupFailure(result.error) : json({ setup: apiSetupView(await getSetup(agencyId)) });

/**
 * PATCH /api/v1/portfolio: one step of the draft, each save naming the version it read.
 * kind=source {version, source}, kind=client {version, mode, clientId?, name?}, kind=project {version, title,
 * contribution, services, behanceImages?}, kind=step {version, step}, kind=pause {version}.
 */
export const PATCH = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const parsed = apiPortfolioPatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const { agency } = auth;
  const input = parsed.data;
  switch (input.kind) {
    case "source": {
      if (input.source === "pdf" && !(await featureOpen("portfolio_import", { agencyHandle: agency.handle }))) return setupFailure("unavailable");
      // Changing the source drops what another source staged (its images stay only if uploaded here).
      return answer(agency.id, await writeSetup(agency.id, input.version, { data: { source: input.source }, clear: ["behance", "socialItemId"], step: 3 }));
    }
    case "client": {
      if (input.mode === "existing") {
        const owned = input.clientId ? await ownedClientId(agency.id, input.clientId) : null;
        if (!owned) return setupFailure("client");
        return answer(agency.id, await writeSetup(agency.id, input.version, { data: { client: { mode: "existing", clientId: owned } }, step: 4 }));
      }
      if (input.mode === "new") {
        if (!rateLimit(`setup-client:${agency.id}`, 20, 60 * 60 * 1000)) return setupFailure("invalid");
        const added = await addClientOnce(agency.id, input.name ?? "", { version: input.version });
        if ("error" in added) return setupFailure(added.error);
        return json({ setup: apiSetupView(await getSetup(agency.id)) });
      }
      return answer(agency.id, await writeSetup(agency.id, input.version, { data: { client: { mode: input.mode } }, step: 4 }));
    }
    case "project": {
      const services = [...new Set(input.services)].filter(isServiceKey);
      if (!services.length) return setupFailure("noServices");
      const current = await getSetup(agency.id);
      const behance = current?.data.behance && input.behanceImages ? { ...current.data.behance, images: current.data.behance.images.filter((u) => input.behanceImages!.includes(u)) } : current?.data.behance;
      return answer(agency.id, await writeSetup(agency.id, input.version, { data: { project: { title: input.title, contribution: input.contribution, services }, ...(behance ? { behance } : {}) }, step: 5 }));
    }
    case "step":
      return answer(agency.id, await writeSetup(agency.id, input.version, { step: input.step }));
    case "pause":
      return answer(agency.id, await writeSetup(agency.id, input.version, { status: "paused" }));
  }
});
