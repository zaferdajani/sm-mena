"use client";

import { Clock, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import { searchTags, tagLabel } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

/**
 * Services as tags (docs/30): type part of a name in Arabic or English and pick
 * a suggestion. Text that matches no tag can be added as a new service; it is
 * saved as a proposal and becomes a tag once an admin approves it. Submits
 * repeated `name` fields (tag keys) and `newName` fields (typed texts).
 */
export function ServicePicker({
  name = "services",
  newName = "newServices",
  defaultKeys = [],
  pending = [],
  popular = [],
  max = 30,
}: {
  name?: string;
  newName?: string;
  defaultKeys?: string[];
  /** Proposals already waiting for review (shown, not editable). */
  pending?: string[];
  /** Quick picks shown under the box before anything is chosen. */
  popular?: string[];
  max?: number;
}) {
  const t = useTranslations("Services");
  const locale = useLocale();
  const [keys, setKeys] = useState<string[]>(defaultKeys);
  const [texts, setTexts] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const suggestions = useMemo(() => searchTags(query, { limit: 8, exclude: keys }), [query, keys]);
  const label = (k: string) => tagLabel(k, locale) ?? k;
  const full = keys.length + texts.length >= max;
  const canAddText = query.trim().length >= 2 && !suggestions.some((s) => [s.nameAr, s.nameEn].some((n) => n.toLowerCase() === query.trim().toLowerCase()));
  const options = [...suggestions.map((s) => ({ kind: "tag" as const, key: s.key })), ...(canAddText ? [{ kind: "text" as const, key: query.trim() }] : [])];

  const add = (o: (typeof options)[number]) => {
    if (full) return;
    if (o.kind === "tag") setKeys((k) => (k.includes(o.key) ? k : [...k, o.key]));
    else setTexts((x) => (x.some((y) => y.toLowerCase() === o.key.toLowerCase()) ? x : [...x, o.key.slice(0, 60)]));
    setQuery("");
    setActive(0);
    input.current?.focus();
  };

  return (
    <div className="grid gap-2" data-testid="service-picker">
      {keys.map((k) => <input key={k} type="hidden" name={name} value={k} />)}
      {texts.map((x) => <input key={x} type="hidden" name={newName} value={x} />)}
      {(keys.length > 0 || texts.length > 0 || pending.length > 0) && (
        <ul className="flex flex-wrap gap-1.5">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-sm text-primary-foreground" data-testid="picked-service">
              {label(k)}
              <button type="button" aria-label={t("remove", { name: label(k) })} onClick={() => setKeys((ks) => ks.filter((x) => x !== k))} className="rounded-full p-0.5 hover:bg-white/20">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {texts.map((x) => (
            <li key={x} className="flex items-center gap-1 rounded-full border border-dashed border-primary px-2.5 py-1 text-sm" data-testid="new-service">
              {x}
              <span className="text-xs text-muted-foreground">· {t("new")}</span>
              <button type="button" aria-label={t("remove", { name: x })} onClick={() => setTexts((xs) => xs.filter((y) => y !== x))} className="rounded-full p-0.5 hover:bg-muted">
                <X className="size-3.5" />
              </button>
            </li>
          ))}
          {pending.map((x) => (
            <li key={`p-${x}`} className="flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-sm text-muted-foreground" title={t("pendingHint")}>
              <Clock className="size-3.5" /> {x}
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={t("search")}
          placeholder={full ? t("full") : t("placeholder")}
          disabled={full}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, options.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              // Never submit the whole form from the search box.
              e.preventDefault();
              if (options[active]) add(options[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
          className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          data-testid="service-search"
        />
        {open && options.length > 0 && (
          <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-lg border bg-popover p-1 shadow-lg">
            {options.map((o, i) => (
              <li
                key={`${o.kind}:${o.key}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm", i === active && "bg-muted")}
                data-testid={o.kind === "tag" ? "service-suggestion" : "service-add-new"}
              >
                {o.kind === "tag" ? (
                  <>
                    <span className="flex-1">{label(o.key)}</span>
                    <span className="text-xs text-muted-foreground" dir="auto">{locale === "ar" ? tagLabel(o.key, "en") : tagLabel(o.key, "ar")}</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4 text-brand" />
                    <span className="flex-1">{t("addNew", { name: o.key })}</span>
                    <span className="text-xs text-muted-foreground">{t("needsReview")}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {popular.filter((p) => !keys.includes(p)).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("popular")}</span>
          {popular
            .filter((p) => !keys.includes(p))
            .slice(0, 10)
            .map((p) => (
              <button key={p} type="button" onClick={() => add({ kind: "tag", key: p })} className="rounded-full border px-2.5 py-1 text-xs hover:bg-muted" data-testid="popular-service">
                + {label(p)}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
