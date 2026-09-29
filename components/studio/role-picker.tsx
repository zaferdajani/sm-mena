"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Plus, Search } from "lucide-react";
import { cleanRoleTitle, customRoleKey, MAX_ROLE_TITLE, MAX_SELECTED_ROLES, normalizeRoleSelection, roleIdentity, roleInputLabel, searchRoles, type RoleOption } from "@/lib/services/role-input";

/** Manual-selection autocomplete: reuse exact matches, suggest partial ones,
 * and require an explicit distinct-specialty choice instead of silent merging.
 */
export function RolePicker({ name, options, values, onChange }: {
  name: "teamRoles" | "seeksRoles"; options: RoleOption[]; values: string[]; onChange: (values: string[]) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("RolePicker");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(-1);
  const [confirmed, setConfirmed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const selected = normalizeRoleSelection(values);
  const selectedIds = new Set(selected.map(roleIdentity));
  const suggestions = searchRoles(query, locale, selected);
  const title = cleanRoleTitle(query);
  const proposed = title ? customRoleKey(title) : null;
  const exact = proposed && (!proposed.startsWith("custom:") || selectedIds.has(roleIdentity(proposed)));
  const atLimit = selected.length >= MAX_SELECTED_ROLES;
  const showSuggestions = expanded && suggestions.length > 0;
  const visibleOptions = [...new Map([...options, ...selected.map((key) => ({ key, label: roleInputLabel(key, locale) }))]
    .map((option) => [roleIdentity(option.key), { ...option, label: roleInputLabel(option.key, locale) }])).values()];

  function choose(key: string) {
    if (selectedIds.has(roleIdentity(key))) { setAnnouncement(t("already")); return; }
    if (atLimit) { setAnnouncement(t("limit")); return; }
    onChange(normalizeRoleSelection([...selected, key]));
    setQuery(""); setExpanded(false); setActive(-1); setConfirmed(false); setAnnouncement(t("selected"));
    input.current?.focus();
  }
  function toggle(key: string) {
    if (selectedIds.has(roleIdentity(key))) {
      onChange(selected.filter((value) => roleIdentity(value) !== roleIdentity(key)));
      setAnnouncement(t("removed"));
    } else choose(key);
  }
  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setExpanded(true);
      if (suggestions.length) setActive((i) => event.key === "ArrowDown" ? (i + 1) % suggestions.length : (i <= 0 ? suggestions.length : i) - 1);
    } else if (event.key === "Escape") {
      event.preventDefault(); setExpanded(false); setActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (showSuggestions && active >= 0) choose(suggestions[active].key);
      else if (exact && proposed) choose(proposed);
      else { setExpanded(true); if (suggestions.length) setActive(0); }
    }
  }
  return (
    <div className="grid min-w-0 gap-3" data-testid={`role-picker-${name}`}>
      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((option) => {
          const checked = selectedIds.has(roleIdentity(option.key));
          return <label key={roleIdentity(option.key)} className={`inline-flex min-h-11 max-w-full cursor-pointer items-center rounded-full border px-3 py-2 text-sm leading-7 focus-within:ring-2 focus-within:ring-ring ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
            <input className="sr-only" type="checkbox" name={name} value={option.key} checked={checked} disabled={atLimit && !checked} onChange={() => toggle(option.key)} />
            <bdi className="break-words">{option.label}</bdi>
          </label>;
        })}
      </div>
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 sm:p-4">
        <label htmlFor={`${id}-input`} className="flex items-center gap-2 text-sm font-semibold"><Plus className="size-4" aria-hidden />{t("label")}</label>
        <div className="relative">
          <Search className="pointer-events-none absolute inset-s-3 top-3.5 size-4 text-muted-foreground" aria-hidden />
          <input ref={input} id={`${id}-input`} type="text" role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={`${id}-results`} aria-activedescendant={showSuggestions && active >= 0 ? `${id}-option-${active}` : undefined}
            aria-describedby={`${id}-hint`} autoComplete="off" maxLength={MAX_ROLE_TITLE} value={query} placeholder={t("placeholder")}
            className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background pe-3 ps-9 py-2 text-base"
            onFocus={() => setExpanded(true)} onBlur={() => { setExpanded(false); setActive(-1); }}
            onChange={(event) => { setQuery(event.target.value); setExpanded(true); setActive(-1); setConfirmed(false); setAnnouncement(""); }} onKeyDown={keyDown} />
        </div>
        <p id={`${id}-hint`} className="text-sm leading-7 text-muted-foreground">{t("hint")}</p>
        <ul id={`${id}-results`} role="listbox" aria-label={t("matches")} hidden={!showSuggestions} className="grid gap-1 rounded-lg border border-border p-1">
          {suggestions.map((option, i) => {
            const added = selectedIds.has(roleIdentity(option.key));
            return <li key={option.key} role="presentation">
              <button type="button" role="option" id={`${id}-option-${i}`} aria-selected={active === i} aria-disabled={added || atLimit} tabIndex={-1}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-start text-sm ${active === i ? "bg-accent" : "hover:bg-muted"}`}
                onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option.key)}>
                <bdi className="min-w-0 break-words">{option.label}</bdi>
                {added ? <span className="flex shrink-0 items-center gap-1 text-xs"><Check className="size-4" aria-hidden />{t("already")}</span> : <Plus className="size-4 shrink-0" aria-hidden />}
              </button>
            </li>;
          })}
        </ul>
        {query.trim() && !title && <p className="text-sm text-destructive">{t("invalid")}</p>}
        {title && proposed && !exact && !atLimit && <div className="grid gap-2">
          {suggestions.length > 0 && !confirmed
            ? <button type="button" className="min-h-11 rounded-lg border border-border px-3 py-2 text-start text-sm underline underline-offset-4" data-testid="role-distinct" onClick={() => setConfirmed(true)}>{t("distinct")}</button>
            : <><button type="button" data-testid="role-create" className="min-h-11 break-words rounded-lg border border-primary px-3 py-2 text-start text-sm font-semibold text-primary" onClick={() => choose(proposed)}>{t("add")} «<bdi>{title}</bdi>»</button><p className="text-sm leading-7 text-muted-foreground">{t("customHint")}</p></>}
        </div>}
        {atLimit && <p className="text-sm text-muted-foreground">{t("limit")}</p>}
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>
    </div>
  );
}
