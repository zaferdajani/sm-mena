import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactChoice } from "@/components/support/contact-choice";
import { SupportForm } from "@/components/support/support-form";
import { Link } from "@/i18n/navigation";
import { helpAiEnabled } from "@/lib/ai/help-assistant";
import { getSessionUser } from "@/lib/auth/session";
import { reportsForViewer } from "@/lib/data/support-threads";
import { getVisitorId } from "@/lib/visitor";

export async function generateMetadata({ params }: PageProps<"/[locale]/support">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Support" });
  return { title: t("title"), robots: { index: false } };
}

export default async function SupportPage({ params, searchParams }: PageProps<"/[locale]/support">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { from, kind } = await searchParams;
  const t = await getTranslations("Support");
  const tt = await getTranslations("SupportThread");
  const [visitorId, user] = await Promise.all([getVisitorId(), getSessionUser()]);
  const mine = await reportsForViewer(visitorId, user?.id ?? null, 10);
  return (
    <div className="mx-auto w-full min-w-0 max-w-[68rem] space-y-6 px-4 py-6 sm:px-6 sm:py-8" data-design-surface="support-workspace">
      <header className="rounded-xl border bg-card p-5 sm:p-6">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("intro")}</p>
      </header>
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <ContactChoice aiEnabled={helpAiEnabled()} />
      {mine.length > 0 && (
        <section className="min-w-0 rounded-xl border bg-card p-5 sm:p-6" data-testid="my-reports">
          <h2 className="mb-2 text-sm font-semibold">{tt("myReports")}</h2>
          <ul className="divide-y text-sm">
            {mine.map((r) => (
              <li key={r.ref}>
                <Link href={`/support/t/${r.token}`} className="flex items-center justify-between gap-2 py-2 hover:underline">
                  <span className="flex items-center gap-2 font-mono" dir="ltr">
                    {r.unread && <span className="size-2 rounded-full bg-destructive" aria-hidden />}
                    {r.ref}
                  </span>
                  <span className="text-xs text-muted-foreground">{r.unread ? tt("newReply") : tt(`status.${r.status}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
        </div>
        <section id="support-form" className="min-w-0 scroll-mt-20 rounded-xl border bg-card p-5 sm:p-6">
          <SupportForm from={typeof from === "string" ? from : ""} kind={kind === "complaint" || kind === "question" || kind === "suggestion" ? kind : "bug"} />
        </section>
      </div>
    </div>
  );
}
