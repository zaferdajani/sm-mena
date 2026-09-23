"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { setInquiryStatusAction } from "@/app/[locale]/(main)/studio/actions";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const t = useTranslations("Studio.inboxPage");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setInquiryStatusAction(id, archived ? "read" : "archived"))}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
      {archived ? t("showActive") : t("archive")}
    </button>
  );
}
