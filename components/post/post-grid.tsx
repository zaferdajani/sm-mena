import { Copy, Megaphone } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { PostView } from "@/lib/data/posts";

/** Instagram-style 3-column grid of square thumbnails. */
export function PostGrid({ posts, sponsoredLabel }: { posts: PostView[]; sponsoredLabel?: string }) {
  return (
    <div className="grid grid-cols-3 gap-0.5 sm:gap-1" data-testid="post-grid">
      {posts.map((post) => {
        const cover = post.images[0];
        return (
          <Link key={post.id} href={`/p/${post.id}`} className="group relative aspect-square overflow-hidden bg-muted" style={{ backgroundColor: cover?.color }}>
            {cover && (
              <Image
                src={cover.thumbUrl}
                alt={post.caption.slice(0, 80)}
                fill
                unoptimized
                sizes="(max-width: 640px) 33vw, 300px"
                className="object-cover transition-opacity group-hover:opacity-90"
              />
            )}
            {post.images.length > 1 && <Copy className="absolute end-1.5 top-1.5 size-4 text-white drop-shadow" />}
            {post.sponsored && sponsoredLabel && (
              <span className="absolute start-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Megaphone className="size-3" />
                {sponsoredLabel}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
