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
  prices: Option[];
};

const FIELDS = ["service", "city", "platform", "industry", "max"] as const;

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

export function ExploreFilters({ options, resultLabel }: { options: FilterOptions; resultLabel: string }) {
  const t = useTranslations("Explore");
  const tc = useTranslations("Common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries([...FIELDS, "verified"].map((f) => [f, params.get(f) ?? ""])),
  );

  const navigate = (next: Record<string, string>) => {
    const query = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    start(() => router.push({ pathname, query }, { scroll: false }));
  };

  const current = Object.fromEntries(params.entries());
  const apply = () => {
    navigate({ ...current, ...draft, q: current.q ?? "" });
    setOpen(false);
  };

  const onSearch = (formData: FormData) => navigate({ ...current, q: String(formData.get("q") ?? "") });

  const labels: Record<string, Map<string, string>> = {
    service: new Map(options.services.flatMap((g) => g.services.map((s) => [s.key, s.label]))),
    city: new Map(options.cities.map((o) => [o.key, o.label])),
    platform: new Map(options.platforms.map((o) => [o.key, o.label])),
    industry: new Map(options.industries.map((o) => [o.key, o.label])),
    max: new Map(options.prices.map((o) => [o.key, o.label])),
  };
  const chips = FIELDS.filter((f) => current[f]).map((f) => ({ field: f, label: labels[f].get(current[f]) ?? current[f] }));
  if (current.verified) chips.push({ field: "verified" as never, label: t("verifiedOnly") });

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
                <Select name="max" label={t("budget")} anyLabel={t("anyBudget")} value={draft.max} options={options.prices} onChange={(v) => setDraft({ ...draft, max: v })} />
                <Select name="platform" label={t("platform")} anyLabel={t("anyPlatform")} value={draft.platform} options={options.platforms} onChange={(v) => setDraft({ ...draft, platform: v })} />
                <Select name="industry" label={t("industry")} anyLabel={t("anyIndustry")} value={draft.industry} options={options.industries} onChange={(v) => setDraft({ ...draft, industry: v })} />
              </div>
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
              key={chip.field}
              type="button"
              onClick={() => navigate({ ...current, [chip.field]: "" })}
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
