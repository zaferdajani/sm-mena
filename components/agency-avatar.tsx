import Image from "next/image";
import { cn } from "@/lib/utils";

export function AgencyAvatar({
  name,
  src,
  size = 32,
  ring = false,
  className,
}: {
  name: string;
  src: string | null;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const initials = name
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const inner = (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-accent-foreground"
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.8) }}
    >
      {src ? <Image src={src} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" /> : initials}
    </span>
  );
  if (!ring) return <span className={cn("inline-flex", className)}>{inner}</span>;
  return (
    <span className={cn("inline-flex rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600 p-[2px]", className)}>
      <span className="rounded-full bg-background p-[2px]">{inner}</span>
    </span>
  );
}
