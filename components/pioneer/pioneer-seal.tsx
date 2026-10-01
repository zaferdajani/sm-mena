/** The seal as drawn on pages and letters: the stamp with the number under it. */
export function PioneerSeal({ number, size = 40, className = "" }: { number: string; size?: number; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 flex-col items-center ${className}`} data-testid="pioneer-seal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/pioneer-seal.svg" alt="" width={size} height={size} />
      <span className="mt-0.5 text-[11px] font-bold tabular-nums tracking-wide" dir="auto">{number}</span>
    </span>
  );
}
