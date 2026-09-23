"use client";

import { Bookmark, Heart, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { likePost, savePost } from "@/app/[locale]/(main)/actions";
import { cn } from "@/lib/utils";

export function useLike(postId: string, liked: boolean, count: number) {
  const [state, setState] = useState({ liked, count });
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, start] = useTransition();
  const toggle = (forceLike = false) => {
    if (forceLike && optimistic.liked) return;
    start(async () => {
      setOptimistic({ liked: !optimistic.liked, count: optimistic.count + (optimistic.liked ? -1 : 1) });
      const result = await likePost(postId).catch(() => null);
      if (result) setState({ liked: result.liked, count: result.count });
    });
  };
  return { ...optimistic, toggle };
}

export function PostActions({
  postId,
  like,
  saved,
  shareUrl,
  shareText,
}: {
  postId: string;
  like: ReturnType<typeof useLike>;
  saved: boolean;
  shareUrl: string;
  shareText: string;
}) {
  const t = useTranslations("Post");
  const tc = useTranslations("Common");
  const [isSaved, setSaved] = useState(saved);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(isSaved);
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();

  const toggleSave = () =>
    start(async () => {
      setOptimisticSaved(!optimisticSaved);
      const result = await savePost(postId).catch(() => null);
      if (result) setSaved(result.saved);
    });

  const share = async () => {
    const url = new URL(shareUrl, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title: shareText, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 pt-1.5">
      <button
        type="button"
        onClick={() => like.toggle()}
        aria-pressed={like.liked}
        aria-label={like.liked ? t("unlike") : t("like")}
        data-testid="like-button"
        className="rounded-full p-2 transition-transform active:scale-90"
      >
        <Heart className={cn("size-6", like.liked && "fill-rose-500 text-rose-500")} />
      </button>
      <button type="button" onClick={share} aria-label={tc("share")} className="rounded-full p-2">
        <Send className="size-6 rtl:-scale-x-100" />
      </button>
      {copied && <span className="text-xs text-muted-foreground">{tc("copied")}</span>}
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={optimisticSaved}
        aria-label={optimisticSaved ? t("unsave") : t("save")}
        data-testid="save-button"
        className="ms-auto rounded-full p-2"
      >
        <Bookmark className={cn("size-6", optimisticSaved && "fill-foreground")} />
      </button>
    </div>
  );
}
