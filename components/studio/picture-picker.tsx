"use client";

import { Check, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ReadPage } from "@/lib/portfolio-import/read-pdf";
import type { ImageRef } from "@/lib/portfolio-import/types";
import { cn } from "@/lib/utils";

export type PictureKind = "photo" | "logo" | "block" | "page";
export type Picture = { ref: ImageRef; kind: PictureKind; preview: string; text: string };

const keyOf = (r: ImageRef) => `${r.page}:${r.crop ?? "p"}`;

/** Every picture the reader found: the photos cut out of grids, the logos, single blocks, and the pages themselves. */
export function picturesOf(pages: ReadPage[]): Picture[] {
  const out: Picture[] = [];
  for (const p of pages) {
    p.crops.forEach((c, crop) => out.push({ ref: { page: p.index, crop }, kind: p.layout === "gallery" ? "photo" : p.layout === "logos" ? "logo" : "block", preview: c.preview, text: c.text }));
    out.push({ ref: { page: p.index, crop: null }, kind: "page", preview: p.preview, text: p.text.slice(0, 80) });
  }
  return out;
}

/**
 * The picture picker (docs/36): all pictures found in the PDF, multi-select,
 * then what to do with the selection: a new post (or add to one), the
 * agency's page logo, or client logos to name.
 */
export function PicturePicker({
  pictures,
  used,
  drafts,
  onPost,
  onAvatar,
  onClientLogos,
}: {
  pictures: Picture[];
  /** Pictures already in a post (shown with a mark). */
  used: Set<string>;
  drafts: { id: number; title: string }[];
  onPost: (refs: ImageRef[], draftId: number | null) => void;
  onAvatar: (ref: ImageRef) => void;
  onClientLogos: (refs: ImageRef[]) => void;
}) {
  const t = useTranslations("PortfolioImport.picker");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<PictureKind | "all">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string>("new");
  const counts = { all: pictures.length, photo: 0, logo: 0, block: 0, page: 0 } as Record<PictureKind | "all", number>;
  for (const p of pictures) counts[p.kind]++;
  const shown = pictures.filter((p) => filter === "all" || p.kind === filter);
  const selected = pictures.filter((p) => picked.has(keyOf(p.ref)));
  const toggle = (k: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const done = () => {
    setPicked(new Set());
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" className="gap-2" data-testid="open-pictures" />}>
        <Images className="size-4" />
        {t("open", { count: pictures.length })}
      </DialogTrigger>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-3 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("title", { count: pictures.length })}</DialogTitle>
          <DialogDescription>{t("hint")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {(["all", "photo", "logo", "block", "page"] as const)
            .filter((k) => counts[k] > 0)
            .map((k) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", filter === k && "border-brand bg-brand-soft font-medium")}>
                {t(`kinds.${k}`)} ({counts[k]})
              </button>
            ))}
          <button type="button" className="ms-auto text-xs text-brand" onClick={() => setPicked(new Set(shown.map((p) => keyOf(p.ref))))}>
            {t("selectAll")}
          </button>
          <button type="button" className="text-xs text-muted-foreground" onClick={() => setPicked(new Set())}>
            {t("clear")}
          </button>
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-max grid-cols-3 content-start gap-2 overflow-y-auto pe-1 sm:grid-cols-5" data-testid="picture-grid">
          {shown.map((p) => {
            const k = keyOf(p.ref);
            const on = picked.has(k);
            return (
              <button key={k} type="button" onClick={() => toggle(k)} aria-pressed={on} className={cn("relative aspect-square overflow-hidden rounded-lg border bg-muted", on && "ring-2 ring-brand")} data-testid="picture" data-kind={p.kind}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={p.text || t(`kinds.${p.kind}`)} className={cn("size-full", p.kind === "logo" || p.kind === "block" ? "bg-white object-contain" : "object-cover")} />
                {on && (
                  <span className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-brand text-white">
                    <Check className="size-3.5" />
                  </span>
                )}
                {used.has(k) && <span className="absolute bottom-1 start-1 rounded bg-background/85 px-1 text-[10px]">{t("inPost")}</span>}
                <span className="absolute bottom-1 end-1 rounded bg-background/85 px-1 text-[10px]">{t("pageN", { n: p.ref.page + 1 })}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-sm font-medium">{t("selected", { count: selected.length })}</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm" aria-label={t("addTo")}>
            <option value="new">{t("newPost")}</option>
            {drafts.map((d, n) => (
              <option key={d.id} value={String(d.id)}>
                {d.title || t("postN", { n: n + 1 })}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!selected.length}
            onClick={() => {
              onPost(selected.map((p) => p.ref), target === "new" ? null : Number(target));
              done();
              setOpen(false);
            }}
            data-testid="pictures-to-post"
          >
            {t("makePost")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={selected.length !== 1}
            onClick={() => {
              onAvatar(selected[0].ref);
              done();
              setOpen(false);
            }}
            data-testid="pictures-to-avatar"
          >
            {t("useAsLogo")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected.length}
            onClick={() => {
              onClientLogos(selected.map((p) => p.ref));
              done();
              setOpen(false);
            }}
            data-testid="pictures-to-clients"
          >
            {t("asClientLogos")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
