"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { deletePostAction } from "@/app/[locale]/(main)/studio/actions";
import { Button } from "@/components/ui/button";

export function DeletePostButton({ postId }: { postId: string }) {
  const t = useTranslations("Studio");
  const tc = useTranslations("Common");
  const [pending, start] = useTransition();
  return (
    <Button
      variant="destructive"
      disabled={pending}
      data-testid="delete-post"
      onClick={() => {
        if (window.confirm(t("confirmDelete"))) start(() => deletePostAction(postId));
      }}
      className="gap-1.5"
    >
      <Trash2 className="size-4" />
      {tc("delete")}
    </Button>
  );
}
