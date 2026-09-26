"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { deleteClientAction, saveClientAction } from "@/app/[locale]/(main)/studio/actions";
import { SocialIcon } from "@/components/social-icon";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LINK_KINDS, linkLabel, type LinkKind } from "@/lib/social-links";
import { Field } from "./chips";
import type { ClientTranslation, ContentLang } from "@/lib/content-lang";
import { OtherLanguage } from "./other-language";

type Option = { key: string; label: string };
export type ClientFormInitial = { id: string; name: string; industry: string | null; country: string | null; description: string; links: { kind: string; value: string }[]; translation?: ClientTranslation | null };

// Empty rows ready to fill for a new client: the accounts agencies run most.
const STARTER: LinkKind[] = ["instagram", "tiktok", "facebook", "website"];

let rowSeq = 0;
const row = (kind: string, value = "") => ({ id: ++rowSeq, kind, value });

/** One portfolio client: its details and as many account rows as the agency needs. */
export function ClientForm({ initial, industries, countries, defaultCountry, contentLang, onDone }: { initial?: ClientFormInitial; industries: Option[]; countries: Option[]; defaultCountry: string; contentLang: ContentLang; onDone?: () => void }) {
  const t = useTranslations("PortfolioClients");
  const [state, action, saving] = useActionState(saveClientAction, undefined);
  const [, startSave] = useTransition();
  // Close the edit form once the save went through.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok && initial) onDone?.();
  }
  const [rows, setRows] = useState(() => (initial?.links.length ? initial.links.map((l) => row(l.kind, l.value)) : STARTER.map((k) => row(k))));
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";
  const error =
    state?.error === "link" ? t("errors.link", { n: (state.index ?? 0) + 1, kind: t(`kinds.${state.kind ?? "other"}`) }) : state?.error ? t(`errors.${state.error}`) : undefined;

  return (
    <form
      // Submitted by hand so a refused save keeps what was typed (form actions reset the form).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startSave(() => action(data));
      }}
      className="grid gap-4 rounded-xl border p-4"
      data-testid="client-form"
    >
      {initial && <input type="hidden" name="clientId" value={initial.id} />}
      <FormError message={error} />
      {state?.ok && !initial && <p role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">✓ {t("saved")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor={`name-${initial?.id ?? "new"}`}>
          <Input id={`name-${initial?.id ?? "new"}`} name="name" required minLength={2} maxLength={80} defaultValue={initial?.name} />
        </Field>
        <Field label={t("industry")} htmlFor={`industry-${initial?.id ?? "new"}`}>
          <select id={`industry-${initial?.id ?? "new"}`} name="industry" defaultValue={initial?.industry ?? ""} className={select}>
            <option value="">—</option>
            {industries.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("country")} htmlFor={`country-${initial?.id ?? "new"}`}>
        <select id={`country-${initial?.id ?? "new"}`} name="country" defaultValue={initial?.country ?? defaultCountry} className={select}>
          {countries.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </Field>
      <Field label={t("description")} htmlFor={`desc-${initial?.id ?? "new"}`}>
        <Textarea id={`desc-${initial?.id ?? "new"}`} name="description" rows={2} maxLength={500} defaultValue={initial?.description} placeholder={t("descriptionPlaceholder")} />
      </Field>
      <OtherLanguage main={contentLang} filled={Boolean(initial?.translation?.name || initial?.translation?.description)}>
        {(attrs, label) => (
          <>
            <Field label={label(t("name"))} htmlFor={`tr-name-${initial?.id ?? "new"}`}>
              <Input id={`tr-name-${initial?.id ?? "new"}`} name="tr_name" maxLength={80} defaultValue={initial?.translation?.name ?? ""} {...attrs} />
            </Field>
            <Field label={label(t("description"))} htmlFor={`tr-desc-${initial?.id ?? "new"}`}>
              <Textarea id={`tr-desc-${initial?.id ?? "new"}`} name="tr_description" rows={2} maxLength={500} defaultValue={initial?.translation?.description ?? ""} {...attrs} />
            </Field>
          </>
        )}
      </OtherLanguage>

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{t("accounts")}</legend>
        <p className="-mt-1 text-xs text-muted-foreground">{t("accountHint")}</p>
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2" data-testid="client-link-row">
            <SocialIcon kind={(LINK_KINDS as readonly string[]).includes(r.kind) ? (r.kind as LinkKind) : "other"} className="size-8" />
            <select
              name="linkKind"
              aria-label={t("accounts")}
              value={r.kind}
              onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, kind: e.target.value } : x)))}
              className="h-9 w-32 shrink-0 rounded-lg border border-input bg-transparent px-2 text-sm"
            >
              {LINK_KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}
            </select>
            <Input
              name="linkValue"
              dir="ltr"
              aria-label={t(`kinds.${r.kind}`)}
              placeholder={r.kind === "website" ? "example.com" : t("accountPlaceholder")}
              value={r.value}
              maxLength={300}
              onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, value: e.target.value } : x)))}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              aria-label={t("removeAccount")}
              onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.id !== r.id) : [row("instagram")]))}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {rows.length < 20 && (
          <button type="button" onClick={() => setRows((rs) => [...rs, row(nextKind(rs.map((x) => x.kind)))])} className="flex w-fit items-center gap-1.5 text-sm font-medium text-brand" data-testid="add-account">
            <Plus className="size-4" /> {t("addAccount")}
          </button>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="h-10" disabled={saving}>{t("save")}</SubmitButton>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

/** The next account type to offer: the first common one not used yet. */
function nextKind(used: string[]): LinkKind {
  return LINK_KINDS.find((k) => !used.includes(k)) ?? "other";
}

export function DeleteClientButton({ clientId }: { clientId: string }) {
  const t = useTranslations("PortfolioClients");
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="gap-1 text-destructive"
      onClick={() => {
        if (window.confirm(t("confirmDelete"))) start(() => deleteClientAction(clientId));
      }}
    >
      <Trash2 className="size-4" /> {t("delete")}
    </Button>
  );
}

/** A saved client in the studio list: its accounts at a glance, edited in place. */
export function ClientItem({ client, industries, countries, industryLabel, postCount, contentLang }: { client: ClientFormInitial; industries: Option[]; countries: Option[]; industryLabel: string | null; postCount: number; contentLang: ContentLang }) {
  const t = useTranslations("PortfolioClients");
  const [editing, setEditing] = useState(false);
  if (editing) return <ClientForm initial={client} industries={industries} countries={countries} defaultCountry={client.country ?? ""} contentLang={contentLang} onDone={() => setEditing(false)} />;
  return (
    <div className="rounded-xl border p-4" data-testid="client-item">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{client.name}</p>
          <p className="text-xs text-muted-foreground">
            {[industryLabel, t("posts", { count: postCount })].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          {t("edit")}
        </Button>
        <DeleteClientButton clientId={client.id} />
      </div>
      {client.links.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {client.links.map((l) => (
            <li key={`${l.kind}:${l.value}`} className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs" dir="ltr">
              <SocialIcon kind={(LINK_KINDS as readonly string[]).includes(l.kind) ? (l.kind as LinkKind) : "other"} className="size-5 text-xs" />
              {linkLabel((LINK_KINDS as readonly string[]).includes(l.kind) ? (l.kind as LinkKind) : "other", l.value)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
