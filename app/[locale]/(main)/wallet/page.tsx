import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { isStaffRole } from "@/lib/auth/permissions";
import { formatFils } from "@/lib/format";
import { virtualCheckoutEnabled, readAllVirtualWallets, readVirtualWallet, type VirtualEntry } from "@/lib/payments/virtual-wallet";
import { notFound } from "next/navigation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

function EntryList({ entries, locale }: { entries: VirtualEntry[]; locale: string }) {
  return (
    <ul className="divide-y text-sm">
      {entries.map((e) => (
        <li key={e.id} className="flex items-baseline justify-between gap-3 py-2" data-testid="wallet-entry">
          <span>
            <span className="font-medium">{e.kind}</span>
            <span className="ms-2 text-muted-foreground">{e.note}</span>
          </span>
          <span className="shrink-0 tabular-nums">{formatFils(e.amountFils, locale, e.currency)}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function WalletPage({ params }: PageProps<"/[locale]/wallet">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!virtualCheckoutEnabled()) notFound();
  const user = await requireUser();
  const t = await getTranslations("VirtualPay");
  const mine = await readVirtualWallet(user.email);
  const all = isStaffRole(user.role) ? await readAllVirtualWallets() : [];
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8" data-testid="virtual-wallet">
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">{t("title")}</p>
        <h1 className="text-2xl font-bold">{t("walletTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("walletBody")}</p>
      </header>
      <section className="rounded-2xl border p-4">
        <h2 className="font-semibold">{user.email}</h2>
        <ul className="mt-2 space-y-1">
          {Object.entries(mine.balances).map(([currency, fils]) => (
            <li key={currency} className="text-lg font-bold tabular-nums" data-testid="wallet-balance">{formatFils(fils, locale, currency)}</li>
          ))}
          {Object.keys(mine.balances).length === 0 && <li className="text-sm text-muted-foreground">{t("emptyBalance")}</li>}
        </ul>
        <EntryList entries={mine.entries} locale={locale} />
      </section>
      {all.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">{t("allWallets")}</h2>
          {all.map(({ key, account }) => (
            <article key={key} className="rounded-xl border p-3" data-testid="wallet-account">
              <p className="text-sm font-medium">{key}</p>
              <ul>
                {Object.entries(account.balances).map(([currency, fils]) => (
                  <li key={currency} className="tabular-nums">{formatFils(fils, locale, currency)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
