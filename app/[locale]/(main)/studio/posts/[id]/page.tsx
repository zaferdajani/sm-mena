import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeletePostButton } from "@/components/studio/delete-post-button";
import { PostForm } from "@/components/studio/post-form";
import { requireAgency } from "@/lib/auth/guards";
import { getPost } from "@/lib/data/posts";
import { postFormOptions } from "@/lib/studio-options";

export default async function EditPostPage({ params }: PageProps<"/[locale]/studio/posts/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const post = await getPost(id, agency.id);
  if (!post || post.agency.id !== agency.id) notFound();
  const tc = await getTranslations("Common");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-lg font-bold">{tc("edit")}</h1>
      <PostForm
        mode="edit"
        {...await postFormOptions(agency.services)}
        initial={{ postId: post.id, caption: post.caption, services: post.services, platforms: post.platforms, industry: post.industry, result: post.result, images: post.images.map((i) => i.thumbUrl) }}
      />
      <div className="border-t pt-4">
        <DeletePostButton postId={post.id} />
      </div>
    </div>
  );
}
