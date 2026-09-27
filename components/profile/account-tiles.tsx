import { Layers } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { localized } from "@/lib/content-lang";
import type { AccountTile } from "@/lib/data/portfolio-clients";
import { cn } from "@/lib/utils";
import styles from "./profile-layout.module.css";

/** Work grouped by account, with readable captions that do not cover the work. */
export async function AccountTiles({ tiles, handle, lang = "ar" }: { tiles: AccountTile[]; handle: string; lang?: string }) {
  const t = await getTranslations("Profile");
  const locale = await getLocale();
  if (!tiles.length) return null;
  return (
    <section className={styles.accountSection} data-testid="account-tiles">
      <h2 className={styles.sectionTitle}>{t("accountsTitle")}</h2>
      <div className={styles.accountGrid}>
        {tiles.map((a) => {
          const name = localized({ name: a.name }, a.translation, lang, locale).name;
          return (
            <Link key={a.id} href={`/a/${handle}/c/${a.id}`} className={styles.accountCard} data-testid="account-tile">
              <div className={styles.accountImage} style={{ backgroundColor: a.cover?.color }}>
                {a.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover.url} alt="" loading="lazy" />
                )}
                <span className={styles.accountIcon}><Layers className="size-4" aria-hidden /></span>
              </div>
              <div className={styles.accountCaption}>
                {a.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.logoUrl} alt="" loading="lazy" className={styles.accountLogo} />
                ) : <span className={cn(styles.accountLogo, styles.accountInitial)} aria-hidden>{name.slice(0, 1)}</span>}
                <span className="min-w-0">
                  <bdi dir="auto" className={styles.accountName}>{name}</bdi>
                  <span className={styles.accountCount}>{t("accountPosts", { count: a.postCount })}</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
