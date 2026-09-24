"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Option = { key: string; label: string };
type Group = { key: string; label: string; services: Option[] };

export type FilterOptions = {
  services: Group[];
  cities: Option[];
  platforms: Option[];
  industries: Option[];
};

// Single-choice fields; platforms (several), the budget range and the toggles are handled separately.
const FIELDS = ["service", "city", "industry"] as const;
const ALL = [...FIELDS, "platforms", "min", "max", "full", "verified"] as const;

function Select({ name, label, anyLabel, value, options, groups, onChange }: {
  name: string; label: string; anyLabel: string; value: string; options?: Option[]; groups?: Group[]; onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-input bg-background px-2"
      >
        <option value="">{anyLabel}</option>
        {groups?.map((g) => (
          <optgroup key={g.key} label={g.label}>
            {g.services.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </optgroup>
        ))}
        {options?.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function ExploreFilters({ options, resultLabel, currency }: { options: FilterOptions; resultLabel: string; currency: string }) {
  const t = useTranslations("Explore");
  const tc = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(ALL.map((f) => [f, params.get(f) ?? ""])),
    platforms: params.get("platforms") ?? params.get("platform") ?? "",
  }));
  const selectedPlatforms = draft.platforms ? draft.platforms.split(",") : [];
  const togglePlatform = (key: string) => {
    const next = selectedPlatforms.includes(key) ? selectedPlatforms.filter((p) => p !== key) : [...selectedPlatforms, key];
    setDraft({ ...draft, platforms: next.join(",") });
  };

  const navigate = (next: Record<string, string>) => {
    const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    start(() => router.push({ pathname, query }, { scroll: false }));
  };

  const current: Record<string, string> = Object.fromEntries(params.entries());
  if (current.platform && !current.platforms) current.platforms = current.platform;
  delete current.platform;
  const apply = () => {
    const min = draft.min.replace(/\D/g, "");
    const max = draft.max.replace(/\D/g, "");
    navigate({ ...current, ...draft, min, max, q: current.q ?? "" });
    setOpen(false);
  };

  const onSearch = (formData: FormData) => navigate({ ...current, q: String(formData.get("q") ?? "") });

  const labels: Record<string, Map<string, string>> = {
    service: new Map(options.services.flatMap((g) => g.services.map((s) => [s.key, s.label]))),
    city: new Map(options.cities.map((o) => [o.key, o.label])),
    industry: new Map(options.industries.map((o) => [o.key, o.label])),
  };
  const platformLabels = new Map(options.platforms.map((o) => [o.key, o.label]));
  // Each chip removes its own filter: one per platform, one for the budget range.
  const chips: { key: string; label: string; next: Record<string, string> }[] = FIELDS.filter((f) => current[f]).map((f) => ({
    key: f,
    label: labels[f].get(current[f]) ?? current[f],
    next: { ...current, [f]: "" },
  }));
  const activePlatforms = current.platforms ? current.platforms.split(",").filter((p) => platformLabels.has(p)) : [];
  for (const p of activePlatforms) {
    chips.push({ key: `platform-${p}`, label: platformLabels.get(p)!, next: { ...current, platforms: activePlatforms.filter((x) => x !== p).join(",") } });
  }
  if (current.min || current.max) {
    const label = current.min && current.max ? t("budgetRange", { min: current.min, max: current.max, currency }) : current.min ? t("budgetFrom", { min: current.min, currency }) : t("upToIn", { price: current.max, currency });
    chips.push({ key: "budget", label, next: { ...current, min: "", max: "" } });
  }
  if (current.full) chips.push({ key: "full", label: t("fullService"), next: { ...current, full: "" } });
  if (current.verified) chips.push({ key: "verified", label: t("verifiedOnly"), next: { ...current, verified: "" } });

  return (
    <div className={cn("space-y-3", pending && "opacity-70")}>
      <div className="flex gap-2">
        <form action={onSearch} className="relative flex-1" role="search">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={current.q} placeholder={t("search")} aria-label={t("search")} className="h-10 ps-9" />
        </form>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" className="h-10 gap-2" data-testid="filters-button" />}>
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">{t("filters")}</span>
            {chips.length > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{chips.length}</span>}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{t("filters")}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-6">
              <Select name="service" label={t("service")} anyLabel={t("anyService")} value={draft.service} groups={options.services} onChange={(v) => setDraft({ ...draft, service: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Select name="city" label={t("city")} anyLabel={t("anyCity")} value={draft.city} options={options.cities} onChange={(v) => setDraft({ ...draft, city: v })} />
                <Select name="industry" label={t("industry")} anyLabel={t("anyIndustry")} value={draft.industry} options={options.industries} onChange={(v) => setDraft({ ...draft, industry: v })} />
              </div>
              <div role="group" aria-labelledby="filter-platforms" className="grid gap-2 text-sm">
                <p id="filter-platforms" className="font-medium">
                  {t("platforms")} <span className="font-normal text-muted-foreground">{t("platformsHint")}</span>
                </p>
                <div className="flex flex-wrap gap-1.5" data-testid="platform-options">
                  {options.platforms.map((o) => {
                    const on = selectedPlatforms.includes(o.key);
                    return (
                      <button
                        key={o.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => togglePlatform(o.key)}
                        className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div role="group" aria-labelledby="filter-budget" className="grid gap-2 text-sm">
                <p id="filter-budget" className="font-medium">{t("budgetMonthly", { currency })}</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    {t("budgetMin")}
                    <Input name="min" inputMode="numeric" dir="ltr" placeholder="0" value={draft.min} onChange={(e) => setDraft({ ...draft, min: e.target.value })} className="h-10" data-testid="budget-min" />
                  </label>
                  <label className="grid gap-1 text-xs text-muted-foreground">
                    {t("budgetMax")}
                    <Input name="max" inputMode="numeric" dir="ltr" placeholder="∞" value={draft.max} onChange={(e) => setDraft({ ...draft, max: e.target.value })} className="h-10" data-testid="budget-max" />
                  </label>
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>
                  {t("fullService")}
                  <span className="block text-xs font-normal text-muted-foreground">{t("fullServiceHint")}</span>
                </span>
                <Switch checked={draft.full === "1"} onCheckedChange={(on) => setDraft({ ...draft, full: on ? "1" : "" })} data-testid="full-service" />
              </label>
              <label className="flex items-center justify-between text-sm font-medium">
                {t("verifiedOnly")}
                <Switch checked={draft.verified === "1"} onCheckedChange={(on) => setDraft({ ...draft, verified: on ? "1" : "" })} />
              </label>
              <div className="flex gap-2">
                <Button className="h-10 flex-1" onClick={apply} data-testid="apply-filters">{t("apply")}</Button>
                <Button variant="outline" className="h-10" onClick={() => { setDraft({}); navigate({ tab: current.tab ?? "" }); setOpen(false); }}>
                  {tc("clearFilters")}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => navigate(chip.next)}
              className="flex items-center gap-1 rounded-full border bg-accent px-3 py-1 text-xs text-accent-foreground"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <span className="text-xs text-muted-foreground">{resultLabel}</span>
        </div>
      )}
    </div>
  );
}
