import { bearerUser, fail, json, route, viewerOf } from "@/lib/api/v1";
import { getAgencyByOwner } from "@/lib/data/agencies";
import { getPost } from "@/lib/data/posts";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/projects/:id: a published project as its owner or any reader the profile's visibility admits
 * (lib/data/publication.ts). Private profiles answer 404 to everyone but the owner, never 403.
 */
export const GET = route(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const bearer = await bearerUser(request);
  const own = bearer ? await getAgencyByOwner(bearer.user.id) : null;
  const post = await getPost(id, own?.id, await viewerOf(request));
  if (!post) return fail("not_found");
  return json({ project: post, owner: Boolean(own && own.id === post.agency.id) });
});
