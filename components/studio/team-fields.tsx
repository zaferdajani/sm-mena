"use client";

import { Handshake } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ChipGroup } from "./chips";

type Option = { key: string; label: string };

/**
 * Who's on the team (docs/30). An agency ticks the roles it has in house and
 * the ones it would like partners for; Sawwiq then suggests freelancers and
 * agencies that fill the gaps. A freelancer ticks what they do.
 */
export function TeamFields({ kind: initialKind, roles, teamRoles, seeksRoles, compact = false }: { kind: "agency" | "freelancer"; roles: Option[]; teamRoles: string[]; seeksRoles: string[]; compact?: boolean }) {
  const t = useTranslations("Partners.form");
  const [kind, setKind] = useState(initialKind);
  const card = "flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent";
  return (
    <fieldset className="grid gap-3" data-testid="team-fields">
      <legend className="mb-2 text-sm font-medium">{t("kind")}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={card}>
          <input type="radio" name="kind" value="agency" checked={kind === "agency"} onChange={() => setKind("agency")} className="mt-1 accent-[var(--primary)]" />
          <span>
            <span className="block font-medium">{t("agency")}</span>
            <span className="block text-xs text-muted-foreground">{t("agencyHint")}</span>
          </span>
        </label>
        <label className={card}>
          <input type="radio" name="kind" value="freelancer" checked={kind === "freelancer"} onChange={() => setKind("freelancer")} className="mt-1 accent-[var(--primary)]" data-testid="kind-freelancer" />
          <span>
            <span className="block font-medium">{t("freelancer")}</span>
            <span className="block text-xs text-muted-foreground">{t("freelancerHint")}</span>
          </span>
        </label>
      </div>
      {kind === "agency" ? (
        <>
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">{t("teamQuestion")}</p>
            <ChipGroup name="teamRoles" options={roles} defaultValues={teamRoles} />
          </div>
          {!compact && (
            <div className="grid gap-1.5 rounded-xl border border-brand-line bg-brand-soft p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Handshake className="size-4 text-brand" /> {t("seeksQuestion")}
              </p>
              <p className="text-xs text-muted-foreground">{t("seeksHint")}</p>
              <ChipGroup name="seeksRoles" options={roles} defaultValues={seeksRoles} />
            </div>
          )}
          {compact && <p className="flex items-start gap-1.5 rounded-lg bg-brand-soft p-2.5 text-xs"><Handshake className="mt-0.5 size-4 shrink-0 text-brand" /> {t("gapHint")}</p>}
        </>
      ) : (
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">{t("doQuestion")}</p>
          <ChipGroup name="teamRoles" options={roles} defaultValues={teamRoles} />
        </div>
      )}
    </fieldset>
  );
}
