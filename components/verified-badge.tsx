import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ label, className = "size-4" }: { label: string; className?: string }) {
  return (
    <BadgeCheck aria-label={label} role="img" className={`${className} shrink-0 fill-sky-500 text-background`} />
  );
}
