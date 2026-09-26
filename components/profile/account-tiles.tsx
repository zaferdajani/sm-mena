import { Layers } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/content-lang";
import type { AccountTile } from "@/lib/data/portfolio-clients";

/**
 * The accounts on an agency's Work tab (docs/28): one tile per account with
 * published work, in the same grid as the posts. Pressing one opens the
 * account's page with all its posts.
 */
export async function AccountTiles({ tiles, handle, lang = "ar" }: { tiles: AccountTile[]; handle: string; lang?: string }) {
  const t = await getTranslations("Profile");
  const locale = await getLocale();
  if (!tiles.length) return null;
  return (
    <section data-testid="account-tiles">
      <h2 className="sr-only">{t("accountsTitle")}</h2>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {tiles.map((a) => {
          const name = localized({ name: a.name }, a.translation, lang, locale).name;
          return (
            <Link key={a.id} href={`/a/${handle}/c/${a.id}`} className="group relative aspect-square overflow-hidden bg-muted" style={{ backgroundColor: a.cover?.color }} data-testid="account-tile">
              {a.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover.url} alt="" loading="lazy" className="size-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
              )}
              <Layers className="absolute end-1.5 top-1.5 size-4 text-white drop-shadow" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-1.5 pt-8 text-white sm:p-2">
                <div className="flex items-center gap-1.5">
                  {a.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.logoUrl} alt="" className="size-7 shrink-0 rounded-full border border-white/80 bg-white object-cover" />
                  ) : (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/90 text-xs font-bold text-foreground">{name.slice(0, 1)}</span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold" dir="auto">{name}</span>
                    <span className="block text-[10px] opacity-90">{t("accountPosts", { count: a.postCount })}</span>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
