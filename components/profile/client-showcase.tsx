import { getLocale, getTranslations } from "next-intl/server";
import { SocialIcon } from "@/components/social-icon";
import { Link } from "@/i18n/navigation";
import { COUNTRIES } from "@/lib/countries";
import type { ClientShowcase } from "@/lib/data/portfolio-clients";
import type { ClientLink } from "@/lib/db/schema";
import { isLinkKind, linkHref, linkLabel } from "@/lib/social-links";
import { localized } from "@/lib/content-lang";

/** The real accounts the agency runs for a client, as chips opening the real profiles. */
export async function AccountLinks({ links }: { links: ClientLink[] }) {
  const tk = await getTranslations("PortfolioClients");
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map((l) => {
        const kind = isLinkKind(l.kind) ? l.kind : "other";
        const href = linkHref(kind, l.value);
        const body = (
          <>
            <SocialIcon kind={kind} className="size-5 text-xs" />
            <span className="sr-only">{tk(`kinds.${kind}`)}: </span>
            <span dir="ltr">{linkLabel(kind, l.value)}</span>
          </>
        );
        return (
          <li key={`${l.kind}:${l.value}`}>
            {href ? (
              <a href={href} target="_blank" rel="nofollow noopener noreferrer ugc" className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted" data-testid="client-link">
                {body}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** The Clients tab: each account the agency handles, with its logo, the real accounts it runs and the work it did for it. */
export async function ClientShowcaseList({ clients: rows, lang = "ar", handle }: { clients: ClientShowcase[]; lang?: string; handle: string }) {
  const t = await getTranslations("Profile");
  const tInd = await getTranslations("Industries");
  const locale = await getLocale();
  const clients = rows.map((c) => ({ ...c, ...localized({ name: c.name, description: c.description }, c.translation, lang, locale) }));
  if (!clients.length) return <p className="px-4 py-16 text-center text-muted-foreground">{t("clientsEmpty")}</p>;
  return (
    <div className="grid gap-4 px-4 py-4" data-testid="client-showcase">
      {clients.map((c) => {
        const country = COUNTRIES.find((x) => x.code === c.country);
        const meta = [c.industry ? tInd(c.industry) : null, country ? `${country.flag} ${locale === "ar" ? country.ar : country.en}` : null].filter(Boolean).join(" · ");
        return (
          <article key={c.id} className="rounded-xl border p-4" data-testid="client-card">
            <div className="flex items-start gap-3">
              <Link href={`/a/${handle}/c/${c.id}`} className="shrink-0">
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logoUrl} alt="" className="size-12 rounded-full border bg-white object-cover" />
                ) : (
                  <span className="grid size-12 place-items-center rounded-full border bg-muted text-lg font-bold text-muted-foreground">{c.name.slice(0, 1)}</span>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold" dir="auto">
                  <Link href={`/a/${handle}/c/${c.id}`} data-testid="client-open">{c.name}</Link>
                </h2>
                {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
              </div>
              <Link href={`/a/${handle}/c/${c.id}`} className="shrink-0 text-xs font-medium text-brand">{t("openAccount")}</Link>
            </div>
            {c.description && <p className="mt-2 whitespace-pre-line text-sm" dir="auto">{c.description}</p>}
            {c.links.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("accountsManaged")}</p>
                <AccountLinks links={c.links} />
              </div>
            )}
            {c.thumbs.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t("clientWork")} ({c.postCount})</p>
                <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
                  {c.thumbs.map((th) => (
                    <Link key={th.postId} href={`/p/${th.postId}`} className="block aspect-square overflow-hidden rounded-md" style={{ background: th.color }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={th.url} alt="" loading="lazy" className="size-full object-cover" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
