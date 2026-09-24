import { currentCountry } from "@/lib/country-choice";
import { countryOf } from "@/lib/countries";
import { storage } from "@/lib/storage";
import { dayIn, listBackgrounds, pickBackground } from "@/lib/theme/backgrounds";

/**
 * The admin-chosen background for the visitor's country interface (image or
 * muted looping video), behind everything, with a veil of the page colour so
 * text stays readable. Video is skipped for people who prefer reduced motion.
 */
export async function InterfaceBackground() {
  const country = await currentCountry();
  const bg = pickBackground(await listBackgrounds(), country, dayIn(countryOf(country).timeZones[0]));
  if (!bg) return null;
  const src = storage().url(bg.mediaKey);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" data-testid="interface-background" data-background={bg.id}>
      {bg.kind === "video" ? (
        <video src={src} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover motion-reduce:hidden" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative background from storage
        <img src={src} alt="" className="size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-background" style={{ opacity: bg.veil / 100 }} />
    </div>
  );
}
