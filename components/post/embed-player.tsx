import type { PostEmbed } from "@/lib/db/schema";
import { safeEmbed } from "@/lib/social/embed";

// The platform's own player for an imported work sample (docs/53): shown only
// in its exact official form, with the platform's controls and attribution.
const SHAPE: Record<PostEmbed["provider"], string> = {
  youtube: "aspect-video",
  tiktok: "aspect-[9/16] max-h-[740px]",
  instagram: "aspect-[4/5]",
  facebook: "aspect-[4/5]",
};

export function EmbedPlayer({ embed, title }: { embed: PostEmbed | null | undefined; title: string }) {
  const safe = safeEmbed(embed);
  if (!safe) return null;
  return (
    <div className={`mx-auto w-full overflow-hidden rounded-xl border bg-black ${SHAPE[safe.provider]}`} data-testid="post-embed">
      <iframe
        src={safe.url}
        title={title}
        loading="lazy"
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
