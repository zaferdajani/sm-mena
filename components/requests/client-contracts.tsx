import { FileSignature } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { clientToken } from "@/lib/data/contracts";
import type { Contract } from "@/lib/db/schema";

/**
 * The business owner's contracts with a way in (docs/14): the private signing link, built on the server for
 * the device that posted the project. A contract waiting for the owner's signature says so first.
 */
export async function ClientContracts({ rows, title = true }: { rows: { contract: Contract; agencyName: string }[]; title?: boolean }) {
  const items = rows.map((r) => ({ ...r, link: clientToken(r.contract) })).filter((r) => r.link);
  if (!items.length) return null;
  const t = await getTranslations("Requests.contracts");
  const ts = await getTranslations("Contracts.status");
  return (
    <section className="space-y-2" data-testid="client-contracts">
      {title && <h2 className="font-semibold">{t("title")}</h2>}
      <ul className="grid gap-2">
        {items.map(({ contract: c, agencyName, link }) => {
          const toSign = c.status === "sent";
          return (
            <li key={c.id}>
              <Link href={`/c/${link}`} className={`flex items-center gap-3 rounded-2xl border p-4 text-sm hover:bg-muted ${toSign ? "border-2 border-brand/50 bg-brand/5" : ""}`} data-testid="request-contract">
                <FileSignature className="size-5 shrink-0 text-brand" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium" dir="auto">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">{agencyName} · {ts(c.status)}</span>
                </span>
                <span className="shrink-0 font-medium text-brand">{toSign ? t("sign") : t("open")}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
