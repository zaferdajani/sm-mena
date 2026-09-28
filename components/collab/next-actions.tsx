import { AlarmClock, Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { NextAction } from "@/lib/collab/next-actions";
import { formatDate } from "@/lib/format";

/** The next-actions panel (docs/50): what waits on this agency, oldest due first; a title and a link, nothing sensitive. */
export async function NextActionsPanel({ actions, locale }: { actions: NextAction[]; locale: string }) {
  const t = await getTranslations("NextActions");
  return (
    <section className="grid gap-2 rounded-2xl border p-4" data-testid="next-actions" data-count={actions.length}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><AlarmClock className="size-4 text-brand" aria-hidden /> {t("title")}</h2>
        <Link href="/studio/collab/preferences" className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand" data-testid="prefs-link"><Settings2 className="size-3.5" aria-hidden /> {t("prefsLink")}</Link>
      </div>
      {actions.length === 0 ? <p className="text-sm text-muted-foreground" data-testid="next-actions-empty">{t("empty")}</p> : (
        <ul className="grid min-w-0 gap-1 [grid-template-columns:minmax(0,1fr)]">
          {actions.slice(0, 8).map((a) => (
            <li key={`${a.kind}-${a.id}`} className="min-w-0">
              <Link href={a.href} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-sm hover:bg-muted" data-testid="next-action" data-kind={a.kind}>
                <span className="flex min-w-0 flex-1 items-baseline gap-1"><span className="shrink-0">{t(`kinds.${a.kind}`)}</span>{a.title ? <><span className="shrink-0 text-muted-foreground">·</span><bdi className="min-w-0 truncate" dir="auto">{a.title}</bdi></> : null}</span>
                {a.due && <span className={a.overdue ? "shrink-0 whitespace-nowrap text-xs font-medium text-destructive" : "shrink-0 whitespace-nowrap text-xs text-muted-foreground"}>{a.overdue ? t("overdue") : t("due", { date: formatDate(a.due, locale) })}</span>}
              </Link>
            </li>
          ))}
          {actions.length > 8 && <li className="px-2 text-xs text-muted-foreground">{t("more", { count: actions.length - 8 })}</li>}
        </ul>
      )}
    </section>
  );
}
