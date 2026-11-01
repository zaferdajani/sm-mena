import { useTranslations } from "next-intl";

/** Keep the surrounding navigation usable while a route's data loads. */
export default function Loading() {
  const t = useTranslations("Common");
  return (
    <div role="status" aria-busy="true" className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
        <div className="h-8 w-1/3 rounded bg-muted" />
        {[0, 1, 2].map((key) => (
          <div key={key} className="space-y-3 rounded-xl border p-4">
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
