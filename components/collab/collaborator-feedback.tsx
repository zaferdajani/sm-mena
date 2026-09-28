import { Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { PublicFeedback } from "@/lib/data/collab-feedback";
import { formatDate } from "@/lib/format";

/**
 * Collaborator feedback on a public page (docs/50): its own class, labelled as
 * such, never averaged into client ratings. Shows who worked with the provider
 * and how it went; the engagement, the client and the files stay confidential.
 */
export async function CollaboratorFeedback({ data, locale }: { data: PublicFeedback; locale: string }) {
  const t = await getTranslations("CollabFeedback");
  return (
    <section className="grid gap-3 rounded-2xl border p-4" data-testid="collaborator-feedback" data-count={data.count}>
      <h2 className="flex items-center gap-2 font-semibold"><Handshake className="size-4 text-brand" aria-hidden /> {t("publicTitle")}</h2>
      <p className="text-xs text-muted-foreground">{t("publicIntro", { count: data.count })}</p>
      {data.averages && (
        <dl className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2 text-center text-sm">
          {(["communication", "reliability", "quality"] as const).map((k) => <div key={k} className="rounded-xl bg-muted/50 p-2"><dt className="text-[11px] text-muted-foreground">{t(k)}</dt><dd className="font-semibold tabular-nums">{data.averages![k]}/5</dd></div>)}
        </dl>
      )}
      <ul className="grid gap-2">
        {data.items.map((f) => (
          <li key={f.id} className="grid gap-1 rounded-xl border p-3 text-sm" data-testid="collaborator-feedback-item">
            <p className="flex flex-wrap items-center justify-between gap-2"><b><bdi>{f.authorName}</bdi></b><span className="text-xs text-muted-foreground">{t(`role.${f.authorRole}`)} · {formatDate(f.createdAt, locale)}</span></p>
            {f.body && <p className="whitespace-pre-line"><bdi>{f.body}</bdi></p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
