"use client";

import Image from "next/image";
import { useState } from "react";

/** The photo over the initials; a missing file (404) falls back to the initials instead of a broken image (QA M-02). */
export function AvatarImage({ src, size }: { src: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <Image src={src} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" onError={() => setFailed(true)} />;
}
