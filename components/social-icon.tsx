import { Camera, Ghost, Globe, Link2, MapPin, Music2, Play } from "lucide-react";
import type { LinkKind } from "@/lib/social-links";
import { cn } from "@/lib/utils";

// Small brand-coloured badges for client accounts (the icon set has no brand logos).
const STYLE: Record<LinkKind, { bg: string; glyph: React.ReactNode }> = {
  instagram: { bg: "bg-gradient-to-br from-[#f9a13a] via-[#e1306c] to-[#833ab4]", glyph: <Camera className="size-[60%]" /> },
  tiktok: { bg: "bg-black ring-1 ring-white/20", glyph: <Music2 className="size-[60%]" /> },
  facebook: { bg: "bg-[#1877f2]", glyph: <span className="font-bold leading-none">f</span> },
  youtube: { bg: "bg-[#ff0000]", glyph: <Play className="size-[55%] fill-current" /> },
  x: { bg: "bg-black ring-1 ring-white/20", glyph: <span className="font-bold leading-none">𝕏</span> },
  snapchat: { bg: "bg-[#fffc00] text-black", glyph: <Ghost className="size-[60%]" /> },
  linkedin: { bg: "bg-[#0a66c2]", glyph: <span className="text-[0.8em] font-bold leading-none">in</span> },
  website: { bg: "bg-brand", glyph: <Globe className="size-[60%]" /> },
  google_maps: { bg: "bg-[#34a853]", glyph: <MapPin className="size-[60%]" /> },
  other: { bg: "bg-muted-foreground", glyph: <Link2 className="size-[60%]" /> },
};

export function SocialIcon({ kind, className }: { kind: LinkKind; className?: string }) {
  const s = STYLE[kind] ?? STYLE.other;
  return (
    <span aria-hidden className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-md text-sm text-white", s.bg, className)}>
      {s.glyph}
    </span>
  );
}
