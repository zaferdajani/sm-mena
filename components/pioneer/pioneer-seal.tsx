/**
 * The First Wave seal (docs/57). The gold medal image at readable sizes; the drawn
 * icon (same shape and colours) where the medal's engraving would blur.
 */
export function PioneerSeal({ number, size = 40, className = "" }: { number: string; size?: number; className?: string }) {
  const src = size >= 48 ? (size > 160 ? "/brand/first-wave-seal.webp" : "/brand/first-wave-seal-192.webp") : "/brand/pioneer-seal.svg";
  return (
    <span className={`inline-flex shrink-0 flex-col items-center ${className}`} data-testid="pioneer-seal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" width={size} height={size} />
      <span className="mt-0.5 text-[11px] font-bold tabular-nums tracking-wide" dir="auto">{number}</span>
    </span>
  );
}
