import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { routing } from "@/i18n/routing";

const steps = [
  { title: "step1Title", body: "step1Body" },
  { title: "step2Title", body: "step2Body" },
  { title: "step3Title", body: "step3Body" },
] as const;

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = useTranslations("Home");

  return (
    <>
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-10 sm:pt-20">
        <p className="text-sm font-medium text-brand">{t("eyebrow")}</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled className="h-12 px-6 text-base">
            {t("cta")}
          </Button>
          <span className="text-sm text-muted-foreground">{t("ctaSoon")}</span>
        </div>
      </section>

      <section className="bg-muted">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="text-2xl font-bold">{t("howTitle")}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-border bg-background p-5"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-tint font-bold text-brand">
                  {(index + 1).toLocaleString(locale)}
                </span>
                <h3 className="mt-4 font-bold">{t(step.title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(step.body)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-xl border border-brand-line bg-brand-soft p-6">
          <h2 className="text-xl font-bold">{t("agenciesTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("agenciesBody")}</p>
        </div>
      </section>
    </>
  );
}
