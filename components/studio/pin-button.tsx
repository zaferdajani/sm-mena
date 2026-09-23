"use client";

import { Pin, PinOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { togglePinAction } from "@/app/[locale]/(main)/studio/actions";

export function PinButton({ postId, pinned }: { postId: string; pinned: boolean }) {
  const t = useTranslations("Packages");
  const [state, setState] = useState(pinned);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={state}
      title={error ? t("pinLimit") : state ? t("unpin") : t("pin")}
      data-testid="pin-button"
      onClick={() =>
        start(async () => {
          const result = await togglePinAction(postId);
          if ("pinned" in result) {
            setState(result.pinned);
            setError(false);
          } else setError(true);
        })
      }
      className={`flex items-center gap-1 ${error ? "text-destructive" : state ? "text-brand" : "text-foreground"}`}
    >
      {state ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
      <span className="sr-only">{state ? t("unpin") : t("pin")}</span>
    </button>
  );
}
