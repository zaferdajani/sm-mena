"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { ImageView } from "@/lib/data/posts";
import { cn } from "@/lib/utils";

export function ImageCarousel({
  images,
  alt,
  priority = false,
  onDoubleTap,
  fill = false,
}: {
  images: ImageView[];
  alt: string;
  priority?: boolean;
  onDoubleTap?: () => void;
  /** Fill the parent (the phone feed's full-screen post): whole image shown, no fixed ratio. */
  fill?: boolean;
}) {
  const t = useTranslations("Post");
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const first = images[0];
  const ratio = first ? Math.min(Math.max(first.width / first.height, 0.8), 1.91) : 1;

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    setIndex(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  const go = (delta: number) => {
    const el = scroller.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: (rtl ? -1 : 1) * delta * el.clientWidth, behavior: "smooth" });
  };

  if (!first) return <div className={fill ? "h-full bg-muted" : "aspect-square bg-muted"} />;

  return (
    <div className={cn("relative bg-muted", fill && "h-full bg-black")} style={fill ? undefined : { aspectRatio: ratio }} onDoubleClick={onDoubleTap}>
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <div key={image.url} className="relative h-full w-full shrink-0 snap-center overflow-hidden" style={{ backgroundColor: image.color }}>
            {/* Full screen: the same photo, blurred, fills the space around the whole one (same file, no extra download). */}
            {fill && <Image src={image.url} alt="" aria-hidden fill unoptimized sizes="100vw" className="scale-110 object-cover opacity-70 blur-2xl" />}
            <Image
              src={image.url}
              alt={image.alt || `${alt} ${t("slide", { n: i + 1, total: images.length })}`}
              fill
              unoptimized
              priority={priority && i === 0}
              sizes="(max-width: 640px) 100vw, 470px"
              className={fill ? "object-contain" : "object-cover"}
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <span className="absolute end-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white" dir="ltr">
            {index + 1}/{images.length}
          </span>
          <button
            type="button"
            aria-label={t("slide", { n: index, total: images.length })}
            onClick={() => go(-1)}
            className={cn("absolute start-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1 text-black shadow sm:block", index === 0 && "sm:hidden")}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </button>
          <button
            type="button"
            aria-label={t("slide", { n: index + 2, total: images.length })}
            onClick={() => go(1)}
            className={cn("absolute end-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/85 p-1 text-black shadow sm:block", index === images.length - 1 && "sm:hidden")}
          >
            <ChevronRight className="size-4 rtl:rotate-180" />
          </button>
          <div className={cn("absolute inset-x-0 flex justify-center gap-1", fill ? "top-3" : "bottom-2")}>
            {images.map((image, i) => (
              <span key={image.url} className={cn("size-1.5 rounded-full bg-white/60", i === index && "bg-white")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
