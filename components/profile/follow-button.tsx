"use client";

import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { followAgency } from "@/app/[locale]/(main)/actions";
import { Button } from "@/components/ui/button";

export function FollowButton({ agencyId, following, count, onCount }: { agencyId: string; following: boolean; count: number; onCount?: (n: number) => void }) {
  const t = useTranslations("Profile");
  const [state, setState] = useState(following);
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, start] = useTransition();
  return (
    <Button
      variant={optimistic ? "secondary" : "default"}
      className="h-9 flex-1"
      aria-pressed={optimistic}
      data-testid="follow-button"
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          const result = await followAgency(agencyId).catch(() => null);
          if (result) {
            setState(result.following);
            onCount?.(result.count);
          } else {
            onCount?.(count);
          }
        })
      }
    >
      {optimistic ? t("following") : t("follow")}
    </Button>
  );
}
