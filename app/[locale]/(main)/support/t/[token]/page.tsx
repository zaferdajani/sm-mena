import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RichReply } from "@/components/support/rich-reply";
import { ThreadReply } from "@/components/support/thread-reply";
import { supportRef } from "@/lib/data/bugs";
import { CONFIRMED_NOTE, markThreadRead, threadByToken } from "@/lib/data/support-threads";
import { cn } from "@/lib/utils";
import { confirmThreadAction } from "../../thread-actions";

// A reporter's conversation about one report (docs/63). The token in the link is the permission.
export async function generateMetadata({ params }: PageProps<"/[locale]/support/t/[token]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "SupportThread" });
  return { title: t("myReports"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

export default async function ThreadPage({ params }: PageProps<"/[locale]/support/t/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("SupportThread");
  const thread = await threadByToken(token);
  if (!thread) return <p className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-muted-foreground" data-testid="thread-missing">{t("notFound")}</p>;
  const { request: r, messages } = thread;
  if (r.reporterUnread) await markThreadRead(r.id);
  const media = (keys: string[], att: { key: string; kind: string }[]) => [...keys, ...att.map((a) => a.key)];
  const files = (list: string[]) =>
    list.length > 0 && (
      <ul className="mt-2 flex flex-wrap gap-2">
        {list.map((key) =>
          key.endsWith(".webp") ? (
            // eslint-disable-next-line @next/next/no-img-element -- private, token-checked route
            <li key={key}><img src={`/api/support-media/${key}?t=${token}`} alt="" className="size-20 rounded-lg border object-cover" loading="lazy" /></li>
          ) : (
            <li key={key} className="w-full"><audio controls preload="none" src={`/api/support-media/${key}?t=${token}`} className="w-full max-w-xs" /></li>
          ),
        )}
      </ul>
    );
  const label = { reporter: t("you"), agent: t("agent"), staff: t("staff") } as Record<string, string>;
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6" data-testid="support-thread" data-status={r.status}>
      <header className="space-y-1">
        <h1 className="text-xl font-bold" dir="auto">{t("title", { ref: supportRef(r.id) })}</h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <p className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium" data-testid="thread-status">{t(`status.${r.status}`)}</p>
      </header>
      <ol className="space-y-3">
        <li className="ms-auto max-w-[90%] rounded-2xl rounded-se-sm bg-primary/10 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold">{t("original")}</p>
          <p className="whitespace-pre-line" dir="auto">{r.message}</p>
          {files(media(r.screenshots, r.attachments))}
        </li>
        {messages.map((m) => (
          <li key={m.id} className={cn("max-w-[90%] rounded-2xl p-3 text-sm", m.author === "reporter" ? "ms-auto rounded-se-sm bg-primary/10" : "rounded-ss-sm border bg-background")} data-testid={`thread-${m.author}`}>
            <p className="mb-1 text-xs font-semibold">{label[m.author] ?? m.author}</p>
            <p className="whitespace-pre-line" dir="auto">{m.author === "reporter" ? (m.body === CONFIRMED_NOTE ? t("worksSent") : m.body) : <RichReply text={m.body} />}</p>
            {files(media(m.screenshots, m.attachments))}
          </li>
        ))}
      </ol>
      {r.resolutionCommit && <p className="text-xs text-muted-foreground" dir="ltr">{t("fixedIn", { commit: r.resolutionCommit.slice(0, 7) })}</p>}
      {r.confirmedAt ? (
        <p className="rounded-xl bg-muted p-3 text-sm" data-testid="thread-confirmed">{t("confirmed")}</p>
      ) : (
        r.status === "done" && (
          <form action={confirmThreadAction}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="thread-works">{t("works")}</button>
          </form>
        )
      )}
      <ThreadReply token={token} done={r.status === "done"} />
    </div>
  );
}
