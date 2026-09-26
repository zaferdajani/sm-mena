import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { AccountLinks } from "@/components/profile/client-showcase";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { clientByConfirmToken } from "@/lib/data/portfolio-clients";
import { mediaUrl } from "@/lib/storage";
import { confirmAccountAction } from "./actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The client's side of a confirmation link (docs/28): one tap says "yes, this agency runs our page". */
export default async function ConfirmAccountPage({ params, searchParams }: PageProps<"/[locale]/confirm-account/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Confirm");
  const found = await clientByConfirmToken(token);
  const justDone = (await searchParams).done === "1";
  if (!found) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground" data-testid="confirm-invalid">{t("invalid")}</div>
    );
  }
  const { client, agency } = found;
  const format = await getFormatter();
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8" data-testid="confirm-page">
      <h1 className="text-xl font-bold" dir="auto">{t("title", { agency: agency.name })}</h1>
      <p className="mt-2 text-sm text-muted-foreground" dir="auto">{t("intro", { agency: agency.name, account: client.name })}</p>
      <div className="mt-5 grid gap-3">
        <section className="flex items-center gap-3 rounded-xl border p-3">
          {client.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.logoUrl} alt="" className="size-12 rounded-full border bg-white object-cover" />
          ) : (
            <span className="grid size-12 place-items-center rounded-full border bg-muted font-bold text-muted-foreground">{client.name.slice(0, 1)}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("account")}</p>
            <p className="font-semibold" dir="auto">{client.name}</p>
            {client.links.length > 0 && <div className="mt-1"><AccountLinks links={client.links} /></div>}
          </div>
        </section>
        <section className="flex items-center gap-3 rounded-xl border p-3">
          <AgencyAvatar name={agency.name} src={mediaUrl(agency.avatarKey)} size={48} />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("agency")}</p>
            <p className="font-semibold" dir="auto">{agency.name}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">@{agency.handle}</p>
          </div>
        </section>
      </div>
      {client.confirmedAt ? (
        <p className="mt-5 flex items-center gap-2 rounded-xl bg-brand-soft p-4 text-sm font-medium text-brand" role="status" data-testid="confirm-done">
          <BadgeCheck className="size-5" /> {justDone ? t("done", { account: client.name }) : t("already", { date: format.dateTime(client.confirmedAt, { dateStyle: "medium" }) })}
        </p>
      ) : (
        <form action={confirmAccountAction} className="mt-5 grid gap-3">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="h-11 gap-2" data-testid="confirm-yes">
            <BadgeCheck className="size-5" /> {t("yes", { agency: agency.name })}
          </Button>
          <p className="text-xs text-muted-foreground">{t("wrong")}</p>
        </form>
      )}
      <Link href={`/a/${agency.handle}`} className="mt-6 inline-block text-sm font-medium text-brand">{t("seeAgency", { agency: agency.name })}</Link>
    </div>
  );
}
