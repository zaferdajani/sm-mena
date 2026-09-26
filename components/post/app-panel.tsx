import { ExternalLink, Smartphone, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PostApp } from "@/lib/app-demo";
import { TryApp } from "./try-app";

/** The app a post shows: its name, kind and version, the sandbox "Try the app", and the store or web links. */
export function AppPanel({ app, compact = false }: { app: PostApp; compact?: boolean }) {
  const t = useTranslations("Post.app");
  return (
    <div className={compact ? "flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs" : "grid gap-2 rounded-xl border p-3 text-sm"} data-testid="post-app">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Smartphone className="size-4 shrink-0 text-brand" />
        <span className="min-w-0">
          <span className="font-semibold" dir="auto">{app.name}</span>
          <span className="text-muted-foreground"> · {t(`kinds.${app.kind}`)}{app.version ? ` · ${t("version", { v: app.version })}` : ""}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {app.tryUrl && <TryApp url={app.tryUrl} name={app.name} />}
        {app.storeUrl && (
          <a href={app.storeUrl} target="_blank" rel="nofollow noopener noreferrer ugc" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted" data-testid="app-store-link">
            <Store className="size-3.5" /> {t("store")}
          </a>
        )}
        {app.webUrl && (
          <a href={app.webUrl} target="_blank" rel="nofollow noopener noreferrer ugc" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted">
            <ExternalLink className="size-3.5" /> {t("web")}
          </a>
        )}
      </div>
      {!compact && app.tryUrl && <p className="text-xs text-muted-foreground">{t("tryHint")}</p>}
    </div>
  );
}
