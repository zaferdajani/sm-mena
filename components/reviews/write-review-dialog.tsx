"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ReviewForm } from "./review-form";

export function WriteReviewDialog({ agencyId, agencyName, services }: { agencyId: string; agencyName: string; services: string[] }) {
  const t = useTranslations("Reviews");
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="gap-1.5" data-testid="write-review" />}>
        <Star className="size-4" />
        {t("write")}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("form.title", { name: agencyName })}</DialogTitle>
        </DialogHeader>
        <ReviewForm mode="inquiry" agencyId={agencyId} services={services} />
      </DialogContent>
    </Dialog>
  );
}
