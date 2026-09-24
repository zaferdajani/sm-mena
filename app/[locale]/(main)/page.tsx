import { Compass, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgenciesStrip } from "@/components/feed/agencies-strip";
import { FeedList } from "@/components/feed/feed-list";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { feedPage } from "@/lib/feed";
import { stripAgencies } from "@/lib/strip";
import { getVisitorId } from "@/lib/visitor";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tn = await getTranslations("Nav");
  const [visitorId, user] = await Promise.all([getVisitorId(), getSessionUser()]);
  const [strip, page] = await Promise.all([stripAgencies(), feedPage({}, null, visitorId, { placement: "feed" })]);

  return (
    <div className="mx-auto w-full max-w-[470px] sm:pt-6">
      <AgenciesStrip agencies={strip} showJoin={!user} />

      <section className="border-b bg-card px-4 py-5 sm:my-6 sm:rounded-xl sm:border sm:shadow-card">
        <h1 className="text-xl leading-snug">{t("introTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("introBody")}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Link href="/match" className={buttonVariants({ className: "cta-bubble h-10 gap-2 px-4" })} data-testid="home-ai">
            <Sparkles className="size-4" />
            {tn("match")}
            <span className="typing" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </Link>
          <Link href="/explore" className={buttonVariants({ variant: "outline", className: "h-9 gap-2 px-4" })}>
            <Compass className="size-4" />
            {t("introCta")}
          </Link>
          {!user && (
            <Link href="/join" className="text-sm font-medium text-brand">
              {t("introAgency")}
            </Link>
          )}
        </div>
      </section>

      {page.items.length ? (
        <FeedList initial={page} placement="feed" />
      ) : (
        <p className="px-4 py-16 text-center text-muted-foreground">{t("emptyFeed")}</p>
      )}
    </div>
  );
}
