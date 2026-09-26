import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BUSINESS_EMOJI, BUSINESS_TYPES, type BusinessType } from "@/lib/business-types";
import { cn } from "@/lib/utils";

/** Chips that filter the feed by business type ("All" first); scrolls sideways on phones. */
export async function BusinessTypeBar({ active, className }: { active: BusinessType | null; className?: string }) {
  const t = await getTranslations("Industries");
  const tf = await getTranslations("Feed");
  const chip = (on: boolean) =>
    cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted");
  return (
    <nav aria-label={tf("typeBarLabel")} className={cn("bg-background/95 backdrop-blur", className)} data-testid="business-type-bar">
      <ul className="flex gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <li>
          <Link href="/feed" className={chip(active === null)} aria-current={active === null ? "page" : undefined} data-testid="type-all">
            {tf("allTypes")}
          </Link>
        </li>
        {BUSINESS_TYPES.map((type) => (
          <li key={type}>
            <Link href={{ pathname: "/feed", query: { type } }} className={chip(active === type)} aria-current={active === type ? "page" : undefined} data-testid={`type-${type}`}>
              <span aria-hidden>{BUSINESS_EMOJI[type]}</span>
              {t(type)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
