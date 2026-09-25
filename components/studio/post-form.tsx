"use client";

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPostAction, updatePostAction } from "@/app/[locale]/(main)/studio/actions";
import { FormError } from "@/components/form-error";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { compressForRequest, POST_UPLOAD, REQUEST_LIMIT } from "@/lib/media/image-compress";
import type { ContentLang, PostTranslation } from "@/lib/content-lang";
import { ChipGroup, Field } from "./chips";
import { OtherLanguage } from "./other-language";

type Option = { key: string; label: string };

export type PostFormProps = {
  mode: "create" | "edit";
  services: { primary: Option[]; other: Option[] };
  platforms: Option[];
  industries: Option[];
  clients: Option[];
  /** The agency's main language; the optional translation is in the other one. */
  contentLang: ContentLang;
  initial?: { postId: string; caption: string; services: string[]; platforms: string[]; industry: string | null; result: string | null; clientId: string | null; images: string[]; translation?: PostTranslation };
};

export function PostForm({ mode, services, platforms, industries, clients, contentLang, initial }: PostFormProps) {
  const t = useTranslations("Studio.form");
  const tc = useTranslations("PortfolioClients");
  const [state, formAction] = useActionState(mode === "create" ? createPostAction : updatePostAction, undefined);
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<{ file: File; url: string }[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list).map((file) => ({ file, url: URL.createObjectURL(file) }))];
    if (next.length > 10) setLocalError("tooMany");
    setFiles(next.slice(0, 10));
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError(null);
    const form = new FormData(event.currentTarget);
    form.delete("images");
    if (mode === "create" && !files.length) return setLocalError("noImages");
    if (!form.getAll("services").length) return setLocalError("noServices");
    start(async () => {
      if (mode === "create") {
        // Compress in the browser at the same visible quality (SSIM search) so
        // the request fits a serverless body limit; the server re-encodes too.
        const small = await compressForRequest(files.map((f) => f.file), POST_UPLOAD);
        if (small.reduce((n, f) => n + f.size, 0) > REQUEST_LIMIT) return setLocalError("too_large");
        for (const f of small) form.append("images", f);
      }
      formAction(form);
    });
  };

  const error = localError ?? state?.error;
  return (
    <form onSubmit={submit} className="grid gap-5" data-testid="post-form">
      <FormError message={error ? t(`errors.${error}`) : undefined} />
      {initial && <input type="hidden" name="postId" value={initial.postId} />}

      {mode === "create" ? (
        <Field label={t("images")} hint={t("imagesHint")}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {files.map((f, i) => (
              <div key={f.url} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="size-full object-cover" />
                {i === 0 && <span className="absolute start-1 bottom-1 rounded bg-black/60 px-1.5 text-[10px] text-white">{t("cover")}</span>}
                <button
                  type="button"
                  aria-label={t("remove")}
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute end-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            {files.length < 10 && (
              <button
                type="button"
                onClick={() => picker.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                <ImagePlus className="size-6" />
                {t("addImages")}
              </button>
            )}
          </div>
          <input
            ref={picker}
            type="file"
            name="images"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
            multiple
            className="sr-only"
            data-testid="image-input"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </Field>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {initial?.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="aspect-square rounded-lg object-cover" />
          ))}
        </div>
      )}

      <Field label={t("caption")} htmlFor="caption">
        <Textarea id="caption" name="caption" rows={4} maxLength={2200} defaultValue={initial?.caption} placeholder={t("captionPlaceholder")} />
      </Field>
      <Field label={t("services")}>
        <ChipGroup name="services" options={[...services.primary, ...services.other]} defaultValues={initial?.services ?? (services.primary.length ? [services.primary[0].key] : [])} />
      </Field>
      <Field label={t("platforms")}>
        <ChipGroup name="platforms" options={platforms} defaultValues={initial?.platforms} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("industry")} htmlFor="industry">
          <select id="industry" name="industry" defaultValue={initial?.industry ?? ""} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">{t("noIndustry")}</option>
            {industries.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </Field>
        <Field label={t("result")} htmlFor="result">
          <Input id="result" name="result" maxLength={80} defaultValue={initial?.result ?? ""} placeholder={t("resultPlaceholder")} />
        </Field>
      </div>
      <OtherLanguage main={contentLang} filled={Boolean(initial?.translation?.caption || initial?.translation?.result)}>
        {(attrs, label) => (
          <>
            <Field label={label(t("caption"))} htmlFor="tr_caption">
              <Textarea id="tr_caption" name="tr_caption" rows={3} maxLength={2200} defaultValue={initial?.translation?.caption ?? ""} {...attrs} />
            </Field>
            <Field label={label(t("result"))} htmlFor="tr_result">
              <Input id="tr_result" name="tr_result" maxLength={80} defaultValue={initial?.translation?.result ?? ""} {...attrs} />
            </Field>
          </>
        )}
      </OtherLanguage>
      <Field label={tc("postClient")} hint={tc("postClientHint")} htmlFor="clientId">
        <div className="flex items-center gap-3">
          <select id="clientId" name="clientId" defaultValue={initial?.clientId ?? ""} className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">{tc("postClientNone")}</option>
            {clients.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <Link href="/studio/clients" className="shrink-0 text-sm text-brand">{clients.length ? tc("manage") : tc("add")}</Link>
        </div>
      </Field>
      {state?.ok && <p role="status" className="text-sm text-brand">✓ {t("saved")}</p>}
      <Button type="submit" disabled={pending} className="h-11 text-base" data-testid="publish-button">
        {pending ? t("publishing") : mode === "create" ? t("publish") : t("saveChanges")}
      </Button>
    </form>
  );
}
