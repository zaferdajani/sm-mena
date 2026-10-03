import { apiSetupView, fail, json, requireApiAgency, route, setupFailure } from "@/lib/api/v1";
import { MAX_IMAGES_PER_POST, MAX_UPLOAD_BYTES } from "@/lib/core/catalog/media-limits";
import { addSetupMedia, getSetup } from "@/lib/data/portfolio-setup";

export const dynamic = "force-dynamic";

/** GET /api/v1/media: the draft's images in order. */
export const GET = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const setup = apiSetupView(await getSetup(auth.agency.id));
  return json({ media: setup?.media ?? [] });
});

/** POST /api/v1/media (multipart: images[]): adds up to the post limit of images to the draft, all or none. */
export const POST = route(async (request) => {
  const auth = await requireApiAgency(request);
  if (auth instanceof Response) return auth;
  const form = await request.formData().catch(() => null);
  const files = (form?.getAll("images") ?? []).filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return fail("invalid", { reason: "noMedia" });
  if (files.length > MAX_IMAGES_PER_POST) return setupFailure("tooMany");
  if (files.some((f) => f.size > MAX_UPLOAD_BYTES)) return fail("invalid", { reason: "too_large" });
  const result = await addSetupMedia(auth.agency.id, await Promise.all(files.map(async (f) => Buffer.from(await f.arrayBuffer()))), "upload");
  if ("error" in result) return setupFailure(result.error);
  return json({ setup: apiSetupView(await getSetup(auth.agency.id)) }, { status: 201 });
});
