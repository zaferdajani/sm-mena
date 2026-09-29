"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { startSetupWithItemAction } from "@/app/[locale]/(main)/portfolio-setup/actions";
import { ItemBrowser, ProviderList, ResourceChooser, type ResourceLite } from "@/components/social/connect";

export { ProviderList };

export function ResourceChooserPanel({ grantId, resources }: { grantId: string; resources: ResourceLite[] }) {
  const router = useRouter();
  return <ResourceChooser grantId={grantId} resources={resources} onDone={() => router.replace("/studio/connections")} />;
}

/** Browsing from the Studio: a pick starts the setup flow with that item (nothing is published). */
export function ItemBrowserList({ resources }: { resources: ResourceLite[] }) {
  const t = useTranslations("Social");
  const router = useRouter();
  if (!resources.length) return null;
  return (
    <div className="space-y-3">
      {resources.map((r) => (
        <details key={r.id} className="rounded-2xl border p-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("browse", { name: r.name })}</summary>
          <ItemBrowser resourceId={r.id} onPick={async (item) => { const res = await startSetupWithItemAction(item.rowId); if (!res.error) router.push("/portfolio-setup"); }} />
        </details>
      ))}
    </div>
  );
}
