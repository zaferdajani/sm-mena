"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setDemoModeAction } from "@/app/[locale]/(main)/demo-actions";

/** Enters or leaves the labelled demo view, then reloads what's on screen. */
export function DemoToggle({ on, label, className, testId }: { on: boolean; label: string; className?: string; testId?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      data-testid={testId ?? (on ? "demo-enter" : "demo-exit")}
      onClick={() =>
        start(async () => {
          await setDemoModeAction(on);
          router.refresh();
        })
      }
    >
      {label}
    </button>
  );
}
