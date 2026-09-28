import { CalendarClock, Compass, Handshake, Inbox, LayoutList, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { canUse } from "@/lib/feature-gate";
import { cn } from "@/lib/utils";

export type CollabView = "discover" | "network" | "work" | "availability" | "needs" | "plan";

/** The four collaboration views (docs/48 §1) plus the agency's own needs. One line, scrolls on a phone. */
export async function CollabTabs({ active, badges = {} }: { active: CollabView; badges?: Partial<Record<CollabView, number>> }) {
  const t = await getTranslations("Collab.tabs");
  const plan = await canUse("collaboration_intelligence");
  const items: { key: CollabView; href: string; icon: typeof Compass }[] = [
    { key: "discover", href: "/studio/collab", icon: Compass },
    { key: "needs", href: "/studio/collab/needs", icon: Handshake },
    { key: "network", href: "/studio/collab/network", icon: Users },
    { key: "work", href: "/studio/collab/work", icon: Inbox },
    { key: "availability", href: "/studio/collab/availability", icon: CalendarClock },
    ...(plan ? [{ key: "plan" as const, href: "/studio/collab/plan", icon: LayoutList }] : []),
  ];
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label={t("label")} data-testid="collab-tabs">
      {items.map(({ key, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={key === active ? "page" : undefined}
          className={cn("flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm", key === active ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
          data-testid={`collab-tab-${key}`}
        >
          <Icon className="size-4" aria-hidden />
          {t(key)}
          {badges[key] ? <span className="rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">{badges[key]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

/** One page header: title, one-line purpose, optional primary action. */
export function CollabHeader({ title, intro, action }: { title: string; intro: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{intro}</p>
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center" data-testid="collab-empty">
      <p className="font-medium">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
