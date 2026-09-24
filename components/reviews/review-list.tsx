import { BadgeCheck, MessageSquareReply } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Review } from "@/lib/db/schema";
import { timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { Stars } from "./stars";

export async function ReviewSummary({ average, count, sub }: { average: number | null; count: number; sub: Record<string, number | null> }) {
  const t = await getTranslations("Reviews");
  if (average === null) return null;
  return (
    <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-[auto_1fr] sm:items-center" data-testid="review-summary">
      <div className="text-center">
        <p className="text-4xl font-bold tabular-nums">{average.toFixed(1)}</p>
        <Stars value={average} />
        <p className="mt-1 text-xs text-muted-foreground">{t("count", { count })}</p>
      </div>
      <dl className="grid gap-2 text-sm">
        {(["results", "quality", "communication", "value", "timeliness"] as const).map((k) =>
          sub[k] === null ? null : (
            <div key={k} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2">
              <dt className="text-muted-foreground">{t(`sub.${k}`)}</dt>
              <dd className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${((sub[k] ?? 0) / 5) * 100}%` }} />
              </dd>
              <dd className="text-end tabular-nums">{sub[k]?.toFixed(1)}</dd>
            </div>
          ),
        )}
      </dl>
    </div>
  );
}

export async function ReviewList({ reviews, agencyName }: { reviews: Review[]; agencyName: string }) {
  const t = await getTranslations("Reviews");
  const locale = await getLocale();
  if (!reviews.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("none")}</p>;
  return (
    <ul className="divide-y" data-testid="review-list">
      {reviews.map((r) => (
        <li key={r.id} className="space-y-2 py-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold">{r.reviewerName}</span>
            {r.reviewerBusiness && <span className="text-muted-foreground">· {r.reviewerBusiness}</span>}
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[11px] text-accent-foreground">
              <BadgeCheck className="size-3" />
              {r.source === "invite" ? t("verifiedClient") : t("viaSawwiq")}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Stars value={r.rating} size="size-3.5" />
            <span>{timeAgo(r.createdAt.toISOString(), locale)}</span>
            {r.service && <span>· {serviceLabel(r.service, locale)}</span>}
          </div>
          <p className="whitespace-pre-line text-sm" dir="auto">{r.body}</p>
          {r.reply && (
            <div className="ms-4 rounded-lg bg-muted px-3 py-2 text-sm">
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold">
                <MessageSquareReply className="size-3.5" />
                {t("reply")} · {agencyName}
              </p>
              <p className="whitespace-pre-line" dir="auto">{r.reply}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
