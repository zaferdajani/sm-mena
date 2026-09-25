"use client";

import { Camera } from "lucide-react";
import { CountryCityField, type CountryOption } from "@/components/country-city-field";
import { useTranslations } from "next-intl";
import { useActionState, useRef, useState } from "react";
import { updateProfileAction } from "@/app/[locale]/(main)/studio/actions";
import { AgencyAvatar } from "@/components/agency-avatar";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AVATAR_UPLOAD, compressForRequest, replaceInputFile } from "@/lib/media/image-compress";
import { contentLang, type AgencyTranslation, type ContentLang } from "@/lib/content-lang";
import { ChipGroup, Field } from "./chips";
import { langAttrs, OtherLanguage } from "./other-language";
import { ServesField } from "./serves-field";

type Option = { key: string; label: string };

export type ProfileFormProps = {
  agency: {
    name: string; handle: string; bio: string; about: string; strengths: string[]; country: string; servesCountries: string[]; city: string; avatarUrl: string | null; services: string[]; platforms: string[]; industries: string[]; languages: string[];
    startingPriceJod: number | null; whatsapp: string | null; phone: string | null; email: string | null; website: string | null; instagram: string | null; foundedYear: number | null; teamSize: string | null;
    contentLang: string; translation: AgencyTranslation | null;
  };
  options: { serviceGroups: { key: string; label: string; services: Option[] }[]; countries: CountryOption[]; platforms: Option[]; industries: Option[]; languages: Option[]; teamSizes: Option[] };
};

export function ProfileForm({ agency, options }: ProfileFormProps) {
  const t = useTranslations("Studio.profileForm");
  const [state, action] = useActionState(updateProfileAction, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const pick = useRef(0);
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";
  const tr = agency.translation ?? {};
  const [main, setMain] = useState<ContentLang>(contentLang(agency.contentLang));
  const [trFilled, setTrFilled] = useState(Boolean(tr.name || tr.bio || tr.about || tr.strengths?.length));
  const form = useRef<HTMLFormElement>(null);
  // Changing the main language keeps every text in its own language: the
  // main and other-language boxes trade places.
  const switchMain = (next: ContentLang) => {
    if (next === main) return;
    const f = form.current;
    let filled = false;
    for (const key of ["name", "bio", "about", "strengths"]) {
      const a = f?.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | null;
      const b = f?.elements.namedItem(`tr_${key}`) as HTMLInputElement | HTMLTextAreaElement | null;
      if (!a || !b) continue;
      [a.value, b.value] = [b.value || (key === "name" ? a.value : ""), a.value];
      filled ||= b.value.trim() !== "";
    }
    setTrFilled(filled);
    setMain(next);
  };

  return (
    <form ref={form} action={action} className="grid gap-6" data-testid="profile-form">
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      {state?.ok && <p role="status" className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">✓ {t("saved")}</p>}

      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={80} />
        )}
        <div>
          <p className="text-sm font-medium">{t("avatar")}</p>
          <button type="button" onClick={() => avatarInput.current?.click()} className="mt-1 flex items-center gap-1.5 text-sm text-brand">
            <Camera className="size-4" />
            {t("changeAvatar")}
          </button>
          <input
            ref={avatarInput}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={async (e) => {
              const input = e.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              setPreview(URL.createObjectURL(file));
              // Shrink in the browser before upload; the server stores a 320 px WebP.
              const id = ++pick.current;
              setCompressing(true);
              const [small] = await compressForRequest([file], AVATAR_UPLOAD);
              if (id !== pick.current) return;
              if (small !== file) replaceInputFile(input, small);
              setCompressing(false);
            }}
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">{t("contentLang")}</legend>
        <p className="mb-2 text-xs text-muted-foreground">{t("contentLangHint")}</p>
        <div className="inline-flex rounded-lg border p-0.5" role="radiogroup">
          {(["ar", "en"] as const).map((l) => (
            <label key={l} className="cursor-pointer rounded-md px-4 py-1.5 text-sm has-[:checked]:bg-primary has-[:checked]:text-primary-foreground">
              <input type="radio" name="contentLang" value={l} checked={main === l} onChange={() => switchMain(l)} className="sr-only" data-testid={`content-lang-${l}`} />
              {t(l === "ar" ? "langAr" : "langEn")}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("name")} htmlFor="name"><Input id="name" name="name" required maxLength={80} defaultValue={agency.name} {...langAttrs(main)} /></Field>
        <Field label={t("handle")} htmlFor="handle"><Input id="handle" name="handle" required maxLength={30} dir="ltr" defaultValue={agency.handle} /></Field>
      </div>
      <Field label={t("bio")} htmlFor="bio"><Textarea id="bio" name="bio" rows={3} maxLength={500} defaultValue={agency.bio} placeholder={t("bioPlaceholder")} {...langAttrs(main)} /></Field>
      <Field label={t("about")} htmlFor="about"><Textarea id="about" name="about" rows={5} maxLength={1500} defaultValue={agency.about} placeholder={t("aboutPlaceholder")} {...langAttrs(main)} /></Field>
      <Field label={t("strengths")} hint={t("strengthsHint")} htmlFor="strengths">
        <Textarea id="strengths" name="strengths" rows={4} maxLength={1000} defaultValue={agency.strengths.join("\n")} placeholder={t("strengthsPlaceholder")} {...langAttrs(main)} />
      </Field>
      <OtherLanguage main={main} filled={trFilled}>
        {(attrs, label) => (
          <>
            <Field label={label(t("name"))} htmlFor="tr_name"><Input id="tr_name" name="tr_name" maxLength={80} defaultValue={tr.name ?? ""} {...attrs} /></Field>
            <Field label={label(t("bio"))} htmlFor="tr_bio"><Textarea id="tr_bio" name="tr_bio" rows={3} maxLength={500} defaultValue={tr.bio ?? ""} {...attrs} /></Field>
            <Field label={label(t("about"))} htmlFor="tr_about"><Textarea id="tr_about" name="tr_about" rows={5} maxLength={1500} defaultValue={tr.about ?? ""} {...attrs} /></Field>
            <Field label={label(t("strengths"))} hint={t("strengthsHint")} htmlFor="tr_strengths">
              <Textarea id="tr_strengths" name="tr_strengths" rows={4} maxLength={1000} defaultValue={(tr.strengths ?? []).join("\n")} {...attrs} />
            </Field>
          </>
        )}
      </OtherLanguage>
      <div className="grid gap-4 sm:grid-cols-2">
        <CountryCityField countries={options.countries} defaultCountry={agency.country} defaultCity={agency.city} countryLabel={t("country")} cityLabel={t("city")} className={select} />
        <Field label={t("startingPrice")} hint={t("startingPriceHint")} htmlFor="startingPriceJod">
          <Input id="startingPriceJod" name="startingPriceJod" type="number" inputMode="numeric" min={0} dir="ltr" defaultValue={agency.startingPriceJod ?? ""} />
        </Field>
      </div>

      <Field label={t("serves")} hint={t("servesHint", { country: options.countries.find((c) => c.code === agency.country)?.name ?? "" })}>
        <ServesField
          options={options.countries.filter((c) => c.code !== agency.country).map((c) => ({ key: c.code, label: `${c.flag} ${c.name}` }))}
          gulf={["sa", "ae", "kw", "qa", "bh", "om"]}
          defaultValues={agency.servesCountries}
          labels={{ gulf: t("servesGulf"), all: t("servesAll"), none: t("servesNone") }}
        />
      </Field>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">{t("services")}</legend>
        {options.serviceGroups.map((g) => (
          <div key={g.key}>
            <p className="mb-1.5 text-xs text-muted-foreground">{g.label}</p>
            <ChipGroup name="services" options={g.services} defaultValues={agency.services} />
          </div>
        ))}
      </fieldset>
      <Field label={t("platforms")}><ChipGroup name="platforms" options={options.platforms} defaultValues={agency.platforms} /></Field>
      <Field label={t("industries")}><ChipGroup name="industries" options={options.industries} defaultValues={agency.industries} /></Field>
      <Field label={t("languages")}><ChipGroup name="languages" options={options.languages} defaultValues={agency.languages} /></Field>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">{t("contact")}</legend>
        <Field label={t("whatsapp")} htmlFor="whatsapp"><Input id="whatsapp" name="whatsapp" type="tel" dir="ltr" defaultValue={agency.whatsapp ?? ""} /></Field>
        <Field label={t("phone")} htmlFor="phone"><Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={agency.phone ?? ""} /></Field>
        <Field label={t("email")} htmlFor="email"><Input id="email" name="email" type="email" dir="ltr" defaultValue={agency.email ?? ""} /></Field>
        <Field label={t("website")} htmlFor="website"><Input id="website" name="website" dir="ltr" defaultValue={agency.website ?? ""} /></Field>
        <Field label={t("instagram")} htmlFor="instagram"><Input id="instagram" name="instagram" dir="ltr" placeholder="@" defaultValue={agency.instagram ?? ""} /></Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">{t("details")}</legend>
        <Field label={t("founded")} htmlFor="foundedYear"><Input id="foundedYear" name="foundedYear" type="number" dir="ltr" min={1950} defaultValue={agency.foundedYear ?? ""} /></Field>
        <Field label={t("team")} htmlFor="teamSize">
          <select id="teamSize" name="teamSize" defaultValue={agency.teamSize ?? ""} className={select}>
            <option value="">—</option>
            {options.teamSizes.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </Field>
      </fieldset>
      <SubmitButton className="h-11 text-base" disabled={compressing}>{t("save")}</SubmitButton>
    </form>
  );
}
