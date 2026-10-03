import { apiSetupView, fail, json, requireApiAgency, route } from "@/lib/api/v1";
import { getSetup, readSetupMedia, removeSetupMedia } from "@/lib/data/portfolio-setup";
import { uuidSchema } from "@/lib/validation/portfolio-setup";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/media/:id: one staged image, only to the agency that uploaded it, never cached by shared caches. */
export const GET = route(async (request, { params }: Params) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const body = uuidSchema.safeParse(id).success ? await readSetupMedia(auth.agency.id, id) : null;
  if (!body) return fail("not_found");
  return new Response(new Uint8Array(body), { headers: { "content-type": "image/webp", "cache-control": "private, no-store", vary: "Authorization", "x-content-type-options": "nosniff" } });
});

/** DELETE /api/v1/media/:id: removes one image from the draft. */
export const DELETE = route(async (request, { params }: Params) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) return fail("invalid", { reason: "media" });
  await removeSetupMedia(auth.agency.id, parsed.data);
  return json({ setup: apiSetupView(await getSetup(auth.agency.id)) });
});
