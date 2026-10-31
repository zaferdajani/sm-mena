import { LayoutDashboard, Pencil, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Shown only to the page's owner on the Work tab: where their work comes from.
 * With nothing visible yet it explains why and sends them to the Studio, so a new
 * provider never has to guess how to add a project.
 */
export async function OwnerWorkPanel({ empty, hidden }: { empty: boolean; hidden: number }) {
  const t = await getTranslations("Profile.owner");
  const primary = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-deep";
  const secondary = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted";
  return (
    <section className={cn("mx-4 my-4 rounded-xl border border-brand-line bg-brand-soft/40 p-4 text-sm", empty && "my-8 text-center")} data-testid="owner-work-panel" data-empty={empty || undefined}>
      <p className="font-semibold">{t(empty ? "emptyTitle" : "title")}</p>
      {!(empty && hidden > 0) && <p className="mt-1 text-muted-foreground">{t(empty ? "emptyBody" : "body")}</p>}
      {hidden > 0 && (
        <p className="mt-2" data-testid="owner-hidden-posts">
          {t("hidden", { count: hidden })}{" "}
          <Link href="/studio/posts" className="font-medium text-brand underline underline-offset-4">{t("manage")}</Link>
        </p>
      )}
      <div className={cn("mt-3 flex flex-wrap gap-2", empty && "justify-center")}>
        <Link href="/studio/new" className={primary} data-testid="owner-add-project"><Plus className="size-4" aria-hidden />{t("add")}</Link>
        {/* Owners look for edit and delete on their own page (staging feedback, 2026-10-29): one tap to them. */}
        {!empty && <Link href="/studio/posts" className={secondary} data-testid="owner-edit-projects"><Pencil className="size-4" aria-hidden />{t("edit")}</Link>}
        <Link href="/studio" className={secondary} data-testid="owner-open-studio"><LayoutDashboard className="size-4" aria-hidden />{t("studio")}</Link>
      </div>
    </section>
  );
}

/**
 * Shown only to the owner on one of their clients' pages and on the Clients tab: how work gets here.
 * Owners asked how the projects under a client were added (staging feedback, 2026-10-31): one tap to add
 * work with that client already chosen, and one to edit the client and its project note.
 */
export async function OwnerClientPanel({ client }: { client?: { id: string; name: string } }) {
  const t = await getTranslations("Profile.ownerClient");
  const primary = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-deep";
  const secondary = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted";
  return (
    <section className="mx-4 my-4 rounded-xl border border-brand-line bg-brand-soft/40 p-4 text-sm" data-testid="owner-client-panel">
      <p className="font-semibold">{client ? t("title", { client: client.name }) : t("listTitle")}</p>
      <p className="mt-1 text-muted-foreground">{client ? t("body", { client: client.name }) : t("listBody")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {client ? (
          <>
            <Link href={{ pathname: "/studio/new", query: { client: client.id } }} className={primary} data-testid="owner-add-client-work"><Plus className="size-4" aria-hidden />{t("addWork")}</Link>
            <Link href="/studio/clients" className={secondary} data-testid="owner-edit-client"><Pencil className="size-4" aria-hidden />{t("editClient")}</Link>
          </>
        ) : (
          <Link href="/studio/clients" className={primary} data-testid="owner-add-client"><Plus className="size-4" aria-hidden />{t("addClient")}</Link>
        )}
        <Link href="/studio/posts" className={secondary} data-testid="owner-edit-projects"><Pencil className="size-4" aria-hidden />{t("editWork")}</Link>
      </div>
    </section>
  );
}
