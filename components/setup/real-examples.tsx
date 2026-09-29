"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AgencyAvatar } from "@/components/agency-avatar";
import { PortfolioExamples } from "@/components/studio/creator-guide";
import { Link } from "@/i18n/navigation";
import { localized, localizedPost } from "@/lib/content-lang";
import type { PostView } from "@/lib/data/posts";
import { serviceLabel } from "@/lib/labels";

const control = "inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * "See an example": real published projects from the demo agencies, with their
 * images, client and caption, labelled as demo pages. Falls back to the written
 * examples when the database holds no demo projects.
 */
export function RealExamples({ examples }: { examples: PostView[] }) {
  const t = useTranslations("Setup.examples");
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const id = useId();
  if (!examples.length) return <PortfolioExamples />;
  const raw = examples[Math.min(index, examples.length - 1)];
  const post = localizedPost(raw, locale);
  const client = post.client ? localized({ name: post.client.name }, { name: post.client.nameTranslation ?? undefined }, post.contentLang, locale).name : null;
  return (
    <details className="rounded-2xl border bg-card p-4" data-testid="real-examples">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("title")}</summary>
      <p className="my-3 text-sm leading-7 text-muted-foreground">{t("note")}</p>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
        {examples.map((e, i) => (
          <button key={e.id} type="button" role="tab" aria-selected={i === index} aria-controls={id} onClick={() => setIndex(i)} data-testid={`real-example-${i}`}
            className={`${control} ${i === index ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
            {e.services[0] ? serviceLabel(e.services[0], locale) : e.agency.name}
          </button>
        ))}
      </div>
      <article id={id} role="tabpanel" className="mt-4 overflow-hidden rounded-xl border bg-background" data-testid="real-example-card">
        <header className="flex items-center gap-3 px-3 py-2.5">
          <AgencyAvatar name={post.agency.name} src={post.agency.avatarUrl} size={36} ring />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{post.agency.name}</p>
            <p className="text-xs text-muted-foreground">{t("demoLabel")}</p>
          </div>
        </header>
        <ul className={`grid gap-1 ${post.images.length > 1 ? "grid-cols-3" : "grid-cols-1"}`}>
          {post.images.slice(0, 3).map((img, i) => (
            <li key={img.url} className="relative aspect-square overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbUrl} alt={img.alt || post.caption.slice(0, 60)} className="size-full object-cover" loading="lazy" />
              {i === 0 && <span className="absolute start-1 bottom-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{t("cover")}</span>}
            </li>
          ))}
        </ul>
        <dl className="grid gap-3 p-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-foreground">{t("forWhom")}</dt>
            <dd className="leading-7">{client ?? t("noClient")}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs font-semibold text-muted-foreground">{t("services")}</dt>
            <dd className="leading-7">{post.services.map((s) => serviceLabel(s, locale)).join("، ")}</dd>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <dt className="text-xs font-semibold text-muted-foreground">{t("caption")}</dt>
            <dd className="whitespace-pre-line leading-7" dir="auto">{post.caption}</dd>
          </div>
        </dl>
        <div className="border-t px-3 py-2 text-sm">
          <Link href={`/p/${post.id}`} className="font-semibold text-brand underline underline-offset-4" target="_blank">{t("open")}</Link>
        </div>
      </article>
    </details>
  );
}
