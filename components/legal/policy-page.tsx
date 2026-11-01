import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";

type Namespace = "PolicyPrivacy" | "PolicyTerms" | "PolicyDelete";

/** A simple titled page of numbered sections from messages (Privacy, Terms, Delete account). */
export async function PolicyPage({ ns, sections, review = true }: { ns: Namespace; sections: number; review?: boolean }) {
  const t = await getTranslations(ns);
  const tc = await getTranslations("PolicyCommon");
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-8" data-testid={`policy-${ns}`}>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {review && <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="note">{tc("review")}</p>}
      <p className="text-muted-foreground">{t("intro")}</p>
      {Array.from({ length: sections }, (_, i) => i + 1).map((n) => (
        <section key={n} className="space-y-1">
          <h2 className="font-semibold">{t(`s${n}t` as "s1t")}</h2>
          <p className="text-sm leading-relaxed">{t(`s${n}` as "s1")}</p>
        </section>
      ))}
      {ns === "PolicyDelete" && <DeleteActions />}
      <nav aria-label={tc("links")} className="flex flex-wrap gap-4 border-t pt-4 text-sm">
        <Link href="/privacy" className="underline">{tc("privacy")}</Link>
        <Link href="/terms" className="underline">{tc("terms")}</Link>
        <Link href="/support" className="underline">{tc("support")}</Link>
        <Link href="/delete-account" className="underline">{tc("delete")}</Link>
      </nav>
    </article>
  );
}

/** Delete account: one tap to the real in-app deletion screen (App Store 5.1.1(v)). */
async function DeleteActions() {
  const t = await getTranslations("PolicyDelete");
  const user = await getSessionUser().catch(() => null);
  const btn = "inline-flex h-10 items-center justify-center rounded-lg border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10";
  return (
    <section className="space-y-2 rounded-xl border border-destructive/30 p-4" data-testid="delete-account-actions">
      <h2 className="font-semibold">{t("goTitle")}</h2>
      <div className="flex flex-wrap gap-2">
        {!user ? (
          <Link href="/signin?next=/delete-account" className={btn} data-testid="delete-signin">{t("goSignin")}</Link>
        ) : (
          <>
            {user.role === "client"
              ? <Link href="/requests" className={btn} data-testid="delete-owner">{t("goOwner")}</Link>
              : <Link href="/studio/security" className={btn} data-testid="delete-agency">{t("goAgency")}</Link>}
          </>
        )}
      </div>
    </section>
  );
}
