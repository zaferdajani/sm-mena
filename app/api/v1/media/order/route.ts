import { apiSetupView, invalidBody, json, readJson, requireApiAgency, route, setupFailure } from "@/lib/api/v1";
import { getSetup, orderSetupMedia } from "@/lib/data/portfolio-setup";
import { apiMediaOrderSchema } from "@/lib/validation/api-v1";

export const dynamic = "force-dynamic";

/** PUT /api/v1/media/order { ids }: the new order of the draft's images (every id must be one of them). */
export const PUT = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const parsed = apiMediaOrderSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const result = await orderSetupMedia(auth.agency.id, parsed.data.ids);
  if ("error" in result) return setupFailure(result.error);
  return json({ setup: apiSetupView(await getSetup(auth.agency.id)) });
});
