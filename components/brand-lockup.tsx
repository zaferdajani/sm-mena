import Image from "next/image";

/** The actual Sawwiq mark and Noto wordmark from the approved brochure. */
export function BrandLockup({ label, compact = false }: { label: string; compact?: boolean }) {
  return (
    <span className={`sw-brand-lockup${compact ? " sw-brand-lockup--compact" : ""}`} role="img" aria-label={label} data-testid="brand-lockup" dir="rtl" translate="no">
      <Image src="/brand/mark-192.png" alt="" width={44} height={44} priority />
      <span className="sw-brand-wordmark" lang="ar" aria-hidden="true">سوّق</span>
    </span>
  );
}
