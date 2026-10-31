import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { logout } from "@/app/[locale]/(auth)/actions";
import { CloseClientAccount } from "@/components/account/close-client-account";
import { ClientContracts } from "@/components/requests/client-contracts";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { contractsForClient } from "@/lib/data/contracts";
import { unreadByRequest } from "@/lib/data/conversations";
import { listVisitorRequests } from "@/lib/data/requests";
import { timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

/**
 * The business owner's home base (bottom tab "My projects"): their projects with the quotes on each, their
 * contracts with a way in, their chats, and their account (sign out, close account), which used to sit only
 * inside Saved.
 */
export default async function MyRequestsPage({ params }: PageProps<"/[locale]/requests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Requests");
  const ts = await getTranslations("Saved");
  const [visitorId, user] = await Promise.all([getVisitorId(), getSessionUser()]);
  const rows = visitorId ? await listVisitorRequests(visitorId) : [];
  const tchat = await getTranslations("Chat");
  const [unread, contracts] = visitorId
    ? await Promise.all([unreadByRequest(visitorId, rows.map((r) => r.request.id)), contractsForClient(visitorId, rows.map((r) => r.request.id))])
    : [new Map<string, number>(), []];
  return (
    <div className="mx-auto w-full min-w-0 max-w-[68rem] space-y-6 px-4 py-6 sm:px-6 sm:py-8" data-design-surface="owner-requests">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 sm:p-6">
        <h1 className="text-xl font-bold">{t("myRequests")}</h1>
        <div className="flex items-center gap-2">
          <Link href="/chats" className={buttonVariants({ size: "sm", variant: "outline" })}>{tchat("clientTitle")}</Link>
          <Link href="/request/new" className={buttonVariants({ size: "sm" })}>{t("newRequest")}</Link>
        </div>
      </header>
      <ClientContracts rows={contracts} />
      <section className="space-y-2">
        {contracts.length > 0 && <h2 className="font-semibold">{t("projectsTitle")}</h2>}
        {!rows.length && (
          <div className="rounded-xl border border-dashed p-4 text-sm" data-testid="requests-empty">
            <p className="text-muted-foreground">{t("noRequests")}</p>
            <Link href="/request/new" className={buttonVariants({ size: "sm", className: "mt-3" })}>{t("newRequest")}</Link>
          </div>
        )}
        {rows.length > 0 && (
          <ul className="divide-y rounded-xl border">
            {rows.map(({ request, proposals }) => (
              <li key={request.id}>
                <Link href={`/requests/${request.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{request.services.map((s) => serviceLabel(s, locale)).join(" · ")}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(request.createdAt.toISOString(), locale)} · {t(`status.${request.status}`)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {unread.get(request.id) ? (
                      <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white" title={tchat("unread")} data-testid="request-unread">
                        {unread.get(request.id)}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground" data-testid="request-proposal-count">{t("proposals", { count: proposals })}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-xl border p-4 text-sm" data-testid="client-account">
        <h2 className="font-semibold">{t("account.title")}</h2>
        {user ? (
          <>
            <p className="mt-1 text-muted-foreground">
              {ts("signedInAs")} <bdi dir="ltr">{user.email}</bdi>
            </p>
            {user.role === "client" && (
              <>
                <form action={logout} className="mt-2">
                  <SubmitButton variant="outline" className="h-9 px-3 text-sm">{ts("signOut")}</SubmitButton>
                </form>
                <div className="mt-4">
                  <CloseClientAccount email={user.email} />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p className="mt-1 text-muted-foreground">{t("account.signedOut")}</p>
            <Link href="/signin?next=/requests" className={buttonVariants({ size: "sm", variant: "outline", className: "mt-2" })}>{ts("signIn")}</Link>
          </>
        )}
      </section>
    </div>
  );
}
