import { BadgeCheck } from "lucide-react";

/** "Business identity verified": the commercial registration was checked (About → labels). */
export function VerifiedBadge({ label, className = "size-4" }: { label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex shrink-0">
      <BadgeCheck aria-hidden="true" className={`${className} shrink-0 fill-sky-500 text-background`} />
    </span>
  );
}
