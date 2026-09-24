/**
 * Scene data for the Sawwiq scroll journey. The film is ONE continuous take
 * (single-shot) cut into five consecutive segments at chapter boundaries, so
 * every seam is two adjacent frames of the same take. Each poster is the first
 * frame of its encoded clip. Both arrays are module constants.
 */
import { createElement } from "react";
import type { ScrollScrubScene, ScrollScrubTheme } from "./scroll-scrub/scroll-scrub";
import { HeroActions } from "./ctas";
import { siteCopy, type Lang } from "./copy";

export const scrollScrubTheme: ScrollScrubTheme = {
  accent: "#0E6B46",
  background: "#F2F2ED",
  ink: "#10231A",
  muted: "#4C5C53",
};

const weights = [1.1, 1.4, 1.4, 1.4, 1.9];

function build(lang: Lang): ScrollScrubScene[] {
  return siteCopy[lang].chapters.map((ch, i) => {
    const n = String(i + 1).padStart(2, "0");
    const scene: ScrollScrubScene = {
      id: ch.id,
      label: ch.label,
      title: ch.title,
      body: ch.body,
      tags: ch.tags,
      actions: i === 0 ? createElement(HeroActions, { lang }) : undefined,
      clip: `/assets/world/scene-${n}.mp4`,
      mobileClip: `/assets/world/scene-${n}-mobile.mp4`,
      poster: `/assets/world/scene-${n}-poster.jpg`,
      mobilePoster: `/assets/world/scene-${n}-mobile-poster.jpg`,
      scroll: weights[i],
      mobileObjectPosition: "50% 22%",
    };
    return scene;
  });
}

export const scrollScrubScenesAr: ScrollScrubScene[] = build("ar");
export const scrollScrubScenesEn: ScrollScrubScene[] = build("en");
