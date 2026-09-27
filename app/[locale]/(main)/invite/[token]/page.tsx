import type { Metadata } from "next";
import { Handshake } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InviteAnswer } from "@/components/collab/widgets";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentAgency } from "@/lib/auth/session";
import { inviteByToken } from "@/lib/data/collab-invites";
import { featureGate } from "@/lib/feature-gate";
import { roleLabel } from "@/lib/services/catalog";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** A collaborator's invitation link (docs/48 §invites): who invites, for what, and accept once signed in. */
export default async function InvitePage({ params }: PageProps<"/[locale]/invite/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Collab.invites");
  const tc = await getTranslations("Collab");
  const tCity = await getTranslations("Cities");
  const [invite, me, gate] = await Promise.all([inviteByToken(token), getCurrentAgency(), featureGate("collaboration")]);
  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10" data-testid="invite-page">
      <Handshake className="size-8 text-brand" aria-hidden />
      {!invite || gate !== "open" ? (
        <p className="text-sm text-muted-foreground" data-testid="invite-missing">{t("missing")}</p>
      ) : (
        <>
          <h1 className="text-xl font-bold break-words">{t("heading", { name: invite.from.name })}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/a/${invite.from.handle}`} className="text-brand hover:underline">{invite.from.name}</Link> · {tc(`kinds.${invite.from.kind}`)} · {tCity(invite.from.city)}
          </p>
          {invite.roles.length > 0 && <p className="text-sm">{t("forRoles")}: {invite.roles.map((r) => roleLabel(r, locale)).join(locale === "ar" ? "، " : ", ")}</p>}
          <p className="text-sm">{t("means")}</p>
          {invite.status !== "pending" ? (
            <p className="rounded-xl border p-3 text-sm text-muted-foreground" data-testid="invite-status">{t(`status.${invite.status}`)}</p>
          ) : me ? (
            <InviteAnswer token={token} />
          ) : (
            <div className="grid gap-2">
              <Link href={{ pathname: "/join", query: { invite: token } }} className={buttonVariants({ className: "h-11" })} data-testid="invite-join">{t("join")}</Link>
              <Link href="/login" className={buttonVariants({ variant: "outline", className: "h-11" })}>{t("signIn")}</Link>
              <p className="text-xs text-muted-foreground">{t("signInHint")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
