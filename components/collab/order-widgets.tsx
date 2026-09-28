"use client";

import { Lock, MessageSquare, Paperclip, Send, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { answerVersionAction, commentAction, createOrderAction, decideAction, linkContractAction, orderTransitionAction, postMessageAction, proposeVersionAction, submitWorkAction, uploadAssetAction, type OrderState } from "@/app/[locale]/(main)/studio/collab/orders/actions";
import { DeliverablesPicker } from "@/components/contracts/deliverables-picker";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChipGroup, Field } from "@/components/studio/chips";
import type { DeliverableLine } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Option = { key: string; label: string };
const ERRORS = ["invalid", "rateLimited", "unavailable", "notFound", "locked", "contract", "capacity", "expired", "image", "too_large", "unsupported", "too_small", "rounds", "max_files"];
const errorText = (t: (k: string) => string, e?: string) => (e ? t(`errors.${ERRORS.includes(e) ? e : "invalid"}`) : undefined);

/** The scope fields shared by "new work order" and "propose an amendment". */
function TermsFields({ initial, platforms, prefix = "" }: { initial?: Partial<{ deliverables: DeliverableLine[]; scope: string; revisionAllowance: number; dueOn: string | null; reviewDays: number; compensationNote: string; permissionScope: string }>; platforms: Option[]; prefix?: string }) {
  const t = useTranslations("Orders.terms");
  const [lines, setLines] = useState<DeliverableLine[]>(initial?.deliverables ?? []);
  return (
    <>
      <input type="hidden" name="deliverables" value={JSON.stringify(lines)} />
      <Field label={t("deliverables")}><DeliverablesPicker value={lines} onChange={setLines} platforms={platforms} /></Field>
      <Field label={t("scope")} htmlFor={`${prefix}scope`}><Textarea id={`${prefix}scope`} name="scope" rows={4} maxLength={3000} defaultValue={initial?.scope ?? ""} dir="auto" placeholder={t("scopeHint")} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("revisions")} hint={t("revisionsHint")} htmlFor={`${prefix}rev`}><Input id={`${prefix}rev`} name="revisionAllowance" type="number" min={0} max={10} defaultValue={initial?.revisionAllowance ?? 2} dir="ltr" /></Field>
        <Field label={t("dueOn")} htmlFor={`${prefix}due`}><Input id={`${prefix}due`} name="dueOn" type="date" defaultValue={initial?.dueOn ?? ""} dir="ltr" /></Field>
        <Field label={t("reviewDays")} htmlFor={`${prefix}rd`}><Input id={`${prefix}rd`} name="reviewDays" type="number" min={1} max={30} defaultValue={initial?.reviewDays ?? 7} dir="ltr" /></Field>
      </div>
      <Field label={t("compensation")} hint={t("compensationHint")} htmlFor={`${prefix}comp`}><Input id={`${prefix}comp`} name="compensationNote" maxLength={300} defaultValue={initial?.compensationNote ?? ""} dir="auto" /></Field>
      <Field label={t("permission")} hint={t("permissionHint")} htmlFor={`${prefix}perm`}><Textarea id={`${prefix}perm`} name="permissionScope" rows={2} maxLength={1000} defaultValue={initial?.permissionScope ?? ""} dir="auto" /></Field>
    </>
  );
}

export function NewOrderForm({ supplier, platforms, inquiryId, contracts, parentContracts, defaults }: { supplier: { id: string; name: string }; platforms: Option[]; inquiryId: string; contracts: { key: string; label: string; milestones: Option[] }[]; parentContracts: Option[]; defaults: { title: string; scope: string; deliverables: DeliverableLine[]; dueOn: string | null } }) {
  const t = useTranslations("Orders");
  const [state, action] = useActionState(createOrderAction, undefined);
  const [contractId, setContractId] = useState("");
  const ms = contracts.find((c) => c.key === contractId)?.milestones ?? [];
  return (
    <form action={action} className="grid gap-5" data-testid="order-form">
      <input type="hidden" name="supplierAgencyId" value={supplier.id} />
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <FormError message={errorText(t, state?.error)} />
      <p className="text-sm text-muted-foreground">{t("new.for", { name: supplier.name })}</p>
      <Field label={t("new.title")} htmlFor="o-title"><Input id="o-title" name="title" required minLength={3} maxLength={120} defaultValue={defaults.title} dir="auto" /></Field>
      <Field label={t("mode.label")} hint={t("mode.hint")}>
        <ChipGroup type="radio" name="mode" options={[{ key: "private", label: t("mode.private") }, { key: "disclosed", label: t("mode.disclosed") }]} defaultValues={["private"]} />
      </Field>
      <TermsFields initial={defaults} platforms={platforms} />
      <section className="grid gap-3 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("link.title")}</h2>
        <p className="text-xs text-muted-foreground">{t("link.intro")}</p>
        <Field label={t("link.contract")}>
          <select name="contractId" value={contractId} onChange={(e) => setContractId(e.target.value)} className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="order-contract">
            <option value="">{t("link.later")}</option>
            {contracts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
        {ms.length > 0 && (
          <Field label={t("link.milestone")}>
            <select name="milestoneId" defaultValue="" className="h-11 w-full rounded-lg border bg-background px-2 text-sm" data-testid="order-milestone">
              <option value="">{t("link.noMilestone")}</option>
              {ms.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </Field>
        )}
        {ms.length === 0 && <input type="hidden" name="milestoneId" value="" />}
        {parentContracts.length > 0 ? (
          <Field label={t("link.parent")} hint={t("link.parentHint")}>
            <select name="parentContractId" defaultValue="" className="h-11 w-full rounded-lg border bg-background px-2 text-sm">
              <option value="">{t("link.noParent")}</option>
              {parentContracts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
        ) : <input type="hidden" name="parentContractId" value="" />}
      </section>
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="h-11 gap-1.5 px-5" name="offer" value="1"><Send className="size-4" /> {t("new.offer")}</SubmitButton>
        <SubmitButton variant="outline" className="h-11" name="offer" value="0">{t("new.saveDraft")}</SubmitButton>
      </div>
    </form>
  );
}

export function TransitionButton({ id, action, label, variant = "default", testId }: { id: string; action: "offer" | "accept" | "decline" | "withdraw" | "cancel" | "close"; label: string; variant?: "default" | "outline" | "ghost" | "destructive"; testId?: string }) {
  const t = useTranslations("Orders");
  const [state, act] = useActionState(orderTransitionAction, undefined);
  return (
    <form action={act} className="grid gap-1">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="action" value={action} />
      <FormError message={errorText(t, state?.error)} />
      <SubmitButton variant={variant} className="h-11" testId={testId}>{label}</SubmitButton>
    </form>
  );
}

/** One composer per audience, labelled beside Send. */
export function MessageComposer({ id, scope, counterpart }: { id: string; scope: "private" | "shared"; counterpart: string }) {
  const t = useTranslations("Orders.thread");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(postMessageAction, undefined);
  const Icon = scope === "private" ? Lock : Users;
  return (
    <form action={action} className={cn("grid gap-2 rounded-2xl border p-3", scope === "private" ? "border-dashed" : "border-brand-line")} data-testid={`composer-${scope}`}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="scope" value={scope} />
      <p className={cn("flex items-center gap-1.5 text-xs font-medium", scope === "private" ? "text-muted-foreground" : "text-brand")}>
        <Icon className="size-3.5" aria-hidden /> {scope === "private" ? t("audiencePrivate") : t("audienceShared", { name: counterpart })}
      </p>
      <FormError message={errorText(to, state?.error)} />
      <Textarea name="body" rows={2} maxLength={2000} required dir="auto" placeholder={scope === "private" ? t("privateHint") : t("sharedHint")} />
      <SubmitButton className="h-11 justify-self-start gap-1.5" testId={`send-${scope}`}><Send className="size-4" /> {scope === "private" ? t("saveNote") : t("send", { name: counterpart })}</SubmitButton>
    </form>
  );
}

export function UploadForm({ id, groups }: { id: string; groups: { id: string; name: string; version: number }[] }) {
  const t = useTranslations("Orders.files");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(uploadAssetAction, undefined);
  const [fileName, setFileName] = useState("");
  return (
    <form action={action} className="grid min-w-0 gap-2 rounded-2xl border p-3" data-testid="upload-form">
      <input type="hidden" name="id" value={id} />
      <p className="flex items-center gap-1.5 text-sm font-medium"><Paperclip className="size-4 text-brand" /> {t("add")}</p>
      <FormError message={errorText(to, state?.error)} />
      {state?.ok && <p className="text-xs text-brand" role="status">✓ {t("added")}</p>}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label htmlFor={`file-${id}`} className={buttonVariants({ variant: "outline", className: "h-11 cursor-pointer" })}>{t("choose")}</label>
        <input id={`file-${id}`} type="file" name="file" accept="image/*" required className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} data-testid="upload-input" />
        <span className="min-w-0 truncate text-sm text-muted-foreground" dir="auto" data-testid="upload-name">{fileName || t("noFile")}</span>
      </div>
      {groups.length > 0 && (
        <label className="grid gap-1 text-xs"><span>{t("asVersionOf")}</span>
          <select name="groupId" defaultValue="" className="h-11 rounded-lg border bg-background px-2 text-sm" data-testid="upload-group">
            <option value="">{t("newFile")}</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name} · {to("versions.current", { n: g.version })}</option>)}
          </select>
        </label>
      )}
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      <SubmitButton className="h-11 justify-self-start" testId="upload-submit">{t("upload")}</SubmitButton>
    </form>
  );
}

/** A comment on one file version; tapping the image records where. */
/** Accept or decline a proposed amendment; errors (capacity, locked) are shown beside the buttons. */
export function VersionAnswer({ id, version, acceptLabel, declineLabel }: { id: string; version: number; acceptLabel: string; declineLabel: string }) {
  const t = useTranslations("Orders");
  const [state, action] = useActionState(answerVersionAction, undefined);
  return (
    <form action={action} className="grid gap-2" data-testid="version-answer-form">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} />
      <FormError message={errorText(t, state?.error)} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="h-11" name="answer" value="accept" testId="version-accept">{acceptLabel}</SubmitButton>
        <SubmitButton variant="outline" className="h-11" name="answer" value="decline" testId="version-decline">{declineLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function CommentForm({ assetId, src, alt }: { assetId: string; src: string; alt: string }) {
  const t = useTranslations("Orders.files");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(commentAction, undefined);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  return (
    <form action={action} className="grid gap-2" data-testid="comment-form">
      <input type="hidden" name="assetId" value={assetId} />
      <input type="hidden" name="x" value={at ? at.x.toFixed(1) : ""} /><input type="hidden" name="y" value={at ? at.y.toFixed(1) : ""} />
      <button
        type="button"
        className="relative mx-auto block w-fit max-w-full cursor-crosshair rounded-lg border focus-visible:outline-2 focus-visible:outline-brand"
        aria-label={t("pinHint")}
        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setAt({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setAt({ x: 50, y: 50 }); } }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block max-h-[70vh] w-auto max-w-full rounded-lg" data-testid="asset-image" />
        {at && <span className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow" style={{ left: `${at.x}%`, top: `${at.y}%` }} aria-hidden />}
      </button>
      <p className="text-xs text-muted-foreground">{at ? t("pinAt", { x: Math.round(at.x), y: Math.round(at.y) }) : t("pinHint")}</p>
      <FormError message={errorText(to, state?.error)} />
      <div className="flex gap-2">
        <Input name="body" maxLength={1000} required dir="auto" placeholder={t("commentHint")} data-testid="comment-input" />
        <SubmitButton className="h-11 shrink-0 gap-1" testId="comment-submit"><MessageSquare className="size-4" /> {t("comment")}</SubmitButton>
      </div>
    </form>
  );
}

export function SubmitWorkForm({ id, round, allowance }: { id: string; round: number; allowance: number }) {
  const t = useTranslations("Orders.review");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(submitWorkAction, undefined);
  return (
    <form action={action} className="grid gap-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="submit-form">
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">{t("submitTitle", { round })}</p>
      <p className="text-xs text-muted-foreground">{t("submitHint", { left: Math.max(0, allowance + 1 - round) })}</p>
      <FormError message={errorText(to, state?.error)} />
      <Textarea name="note" rows={3} maxLength={2000} dir="auto" placeholder={t("submitNote")} />
      <SubmitButton className="h-11 justify-self-start px-5" testId="submit-work">{t("submit")}</SubmitButton>
    </form>
  );
}

export function DecisionForm({ id, effectHint }: { id: string; effectHint: string }) {
  const t = useTranslations("Orders.review");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(decideAction, undefined);
  if (state?.ok) return <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" role="status" data-testid="decision-done" data-effect={state.effect}>✓ {t(`effects.${state.effect ?? "no_milestone"}`)}</p>;
  return (
    <form action={action} className="grid gap-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4" data-testid="decision-form">
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">{t("decideTitle")}</p>
      <p className="text-xs text-muted-foreground">{effectHint}</p>
      <FormError message={errorText(to, state?.error)} />
      <Textarea name="note" rows={3} maxLength={2000} dir="auto" placeholder={t("decideNote")} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton className="h-11 px-5" name="decision" value="approved" testId="approve-work">{t("approve")}</SubmitButton>
        <SubmitButton variant="outline" className="h-11" name="decision" value="changes_requested" testId="request-changes">{t("changes")}</SubmitButton>
      </div>
    </form>
  );
}

export function AmendmentForm({ id, platforms, initial, editing = false }: { id: string; platforms: Option[]; initial: Parameters<typeof TermsFields>[0]["initial"]; editing?: boolean }) {
  const t = useTranslations("Orders.versions");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(proposeVersionAction, undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <p className="text-sm text-brand" role="status" data-testid="amendment-sent">✓ {editing ? t("edited") : t("proposed")}</p>;
  if (!open) return <Button type="button" variant="outline" className="h-11 justify-self-start" onClick={() => setOpen(true)} data-testid="amend-open">{editing ? t("edit") : t("propose")}</Button>;
  return (
    <form action={action} className="grid gap-4 rounded-2xl border p-4" data-testid="amend-form">
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold">{editing ? t("edit") : t("proposeTitle")}</p>
      <p className="text-xs text-muted-foreground">{editing ? t("editHint") : t("proposeHint")}</p>
      <FormError message={errorText(to, state?.error)} />
      <TermsFields initial={initial} platforms={platforms} prefix="am-" />
      <div className="flex gap-2">
        <SubmitButton className="h-11 px-5" testId="amend-submit">{editing ? t("saveEdit") : t("send")}</SubmitButton>
        <Button type="button" variant="ghost" className="h-11" onClick={() => setOpen(false)}>{to("cancel")}</Button>
      </div>
    </form>
  );
}

export function LinkContractForm({ id, contracts }: { id: string; contracts: { key: string; label: string; milestones: Option[] }[] }) {
  const t = useTranslations("Orders.link");
  const to = useTranslations("Orders");
  const [state, action] = useActionState(linkContractAction, undefined);
  const [contractId, setContractId] = useState(contracts[0]?.key ?? "");
  const ms = contracts.find((c) => c.key === contractId)?.milestones ?? [];
  if (!contracts.length) return null;
  return (
    <form action={action} className="grid gap-2 rounded-2xl border p-3" data-testid="link-form">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm font-medium">{t("title")}</p>
      <FormError message={errorText(to, state?.error)} />
      <select name="contractId" value={contractId} onChange={(e) => setContractId(e.target.value)} className="h-11 rounded-lg border bg-background px-2 text-sm">
        {contracts.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </select>
      <select name="milestoneId" defaultValue="" className="h-11 rounded-lg border bg-background px-2 text-sm" data-testid="link-milestone">
        <option value="">{t("noMilestone")}</option>
        {ms.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
      </select>
      <SubmitButton className="h-11 justify-self-start" testId="link-submit">{t("link")}</SubmitButton>
    </form>
  );
}

export type { OrderState };
